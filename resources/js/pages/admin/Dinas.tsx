import { useState, useEffect, useMemo, startTransition } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface DinasData {
  id: number;
  nama: string;
  singkatan: string;
  nomor_telepon: string | null;
  kuota_per_hari: number | null;
  latitude: number | null;
  longitude: number | null;
}

const EMPTY_FORM = {
  nama: '',
  singkatan: '',
  nomor_telepon: '',
  kuota_per_hari: '2',
  latitude: '',
  longitude: '',
};

export default function Dinas() {
  const { user } = useAuth();
  const isSuperAdmin = user?.dinas_id === null;

  const [data, setData] = useState<DinasData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dinas');
      if (res.data.success) {
        setData(res.data.data);
      } else {
        showToast(res.data.message || 'Gagal memuat data.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const query = search.toLowerCase();
    return data.filter(d => 
      d.nama.toLowerCase().includes(query) || 
      d.singkatan.toLowerCase().includes(query) ||
      (d.nomor_telepon && d.nomor_telepon.includes(query))
    );
  }, [data, search]);

  const handleOpenAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const handleOpenEdit = (item: DinasData) => {
    setEditId(item.id);
    setForm({
      nama: item.nama,
      singkatan: item.singkatan,
      nomor_telepon: item.nomor_telepon || '',
      kuota_per_hari: (item.kuota_per_hari ?? 2).toString(),
      latitude: item.latitude !== null ? item.latitude.toString() : '',
      longitude: item.longitude !== null ? item.longitude.toString() : '',
    });
    setErrors({});
    setShowForm(true);
  };

  const handleFormChange = (name: keyof typeof EMPTY_FORM) => (e: any) => {
    setForm(current => ({ ...current, [name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const payload = {
        nama: form.nama,
        singkatan: form.singkatan,
        nomor_telepon: form.nomor_telepon || null,
        kuota_per_hari: form.kuota_per_hari ? parseInt(form.kuota_per_hari, 10) : 2,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };

      const res = editId
        ? await api.put(`/admin/dinas/${editId}`, payload)
        : await api.post('/admin/dinas', payload);

      if (res.data.success) {
        showToast(res.data.message || 'Data berhasil disimpan.', 'success');
        setShowForm(false);
        setForm(EMPTY_FORM);
        fetchData();
      } else {
        showToast(res.data.message || 'Gagal menyimpan data.', 'error');
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        showToast(err.response?.data?.message || 'Terjadi kesalahan jaringan saat menyimpan.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data dinas ini?')) {
      return;
    }

    try {
      const res = await api.delete(`/admin/dinas/${id}`);
      if (res.data.success) {
        showToast('Dinas berhasil dihapus.', 'success');
        fetchData();
      } else {
        showToast(res.data.message || 'Gagal menghapus data.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  return (
    <AdminLayout>
      <style>{`
        .dinas-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 600px) {
          .dinas-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      {toast && (
        <div style={{position:'fixed',bottom:'24px',right:'24px',padding:'12px 20px',borderRadius:'10px',color:'white',fontSize:'13.5px',fontWeight:'600',zIndex:9999,boxShadow:'0 4px 12px rgba(0,0,0,0.1)',background:toast.type==='error'?'#B91C1C':'#0028B3'}}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:'24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h2 style={{fontSize:'22px',fontWeight:'800',color:'#001178',letterSpacing:'-0.3px'}}>Master Data Dinas</h2>
          <p style={{fontSize:'13.5px',color:'#64748B',marginTop:'3px'}}>Kelola data instansi dinas Kabupaten Bogor (nomor telepon, koordinat lokasi, singkatan)</p>
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
          {isSuperAdmin ? (
            <button onClick={handleOpenAdd}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                minHeight: '42px',
                border: 'none',
                borderRadius: '8px',
                background: '#0028B3',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13.5px',
                fontWeight: '700',
                fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(0,40,179,0.25)',
                transition: 'all 0.18s ease'
              }}>
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Tambah Dinas</span>
            </button>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px', background: '#F1F5F9', color: '#475569', fontSize: '12.5px', fontWeight: '700', border: '1px solid #CBD5E1' }}>
              🔒 Mode Lihat Saja (Read-Only)
            </span>
          )}
          {isSuperAdmin && (
            <>
              <button onClick={() => window.dispatchEvent(new Event('open-kuota-modal'))}
                style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',minHeight:'42px',border:'1px solid #C5DBFF',borderRadius:'8px',background:'white',color:'#001178',cursor:'pointer',fontSize:'13px',fontWeight:'700',fontFamily:'inherit',boxShadow:'0 2px 8px rgba(0,17,120,0.06)',transition:'all 0.2s'}}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Pengaturan Kuota Kunjungan
              </button>
              <button onClick={() => window.dispatchEvent(new Event('open-pengaturan-modal'))}
                style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',minHeight:'42px',border:'1px solid #C5DBFF',borderRadius:'8px',background:'white',color:'#001178',cursor:'pointer',fontSize:'13px',fontWeight:'700',fontFamily:'inherit',boxShadow:'0 2px 8px rgba(0,17,120,0.06)',transition:'all 0.2s'}}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                Pengaturan Publik
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Filter */}
      <div style={{background:'white',padding:'16px 20px',borderRadius:'16px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',border:'1px solid rgba(228, 231, 237, 0.8)',marginBottom:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input 
          type="text"
          placeholder="Cari dinas berdasarkan nama, singkatan, atau nomor telepon..."
          value={search}
          onChange={(e) => startTransition(() => setSearch(e.target.value))}
          style={{flex:1,border:'none',outline:'none',fontSize:'14px',color:'#1E293B',fontFamily:'inherit'}}
        />
      </div>

      {/* Form Tambah/Edit (Super Admin Only) */}
      {isSuperAdmin && showForm && (
        <div style={{background:'white',borderRadius:'16px',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',border:'1.5px solid #0028B3',overflow:'hidden',marginBottom:'20px'}}>
          <div style={{padding:'16px 20px',background:'#0028B3',color:'white',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:'15px',fontWeight:'700'}}>{editId ? 'Edit Dinas' : 'Tambah Dinas Baru'}</div>
            <button onClick={()=>setShowForm(false)} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'white',width:'30px',height:'30px',borderRadius:'8px',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
          <form onSubmit={handleSubmit} className="dinas-form-grid" style={{padding:'20px'}}>
            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              <label style={{fontSize:'12.5px',fontWeight:'700',color:'#475569'}}>Nama Dinas</label>
              <input type="text" value={form.nama} onChange={handleFormChange('nama')} placeholder="Nama lengkap instansi..." required
                style={{padding:'10px 14px',borderRadius:'8px',border:'1px solid #CBD5E1',fontSize:'13.5px',fontFamily:'inherit',outline:'none'}} />
              {errors.nama && <span style={{fontSize:'12px',color:'#B91C1C'}}>{errors.nama[0]}</span>}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              <label style={{fontSize:'12.5px',fontWeight:'700',color:'#475569'}}>Singkatan / Akronim</label>
              <input type="text" value={form.singkatan} onChange={handleFormChange('singkatan')} placeholder="Misal: Bappenda, Disdik..." required
                style={{padding:'10px 14px',borderRadius:'8px',border:'1px solid #CBD5E1',fontSize:'13.5px',fontFamily:'inherit',outline:'none'}} />
              {errors.singkatan && <span style={{fontSize:'12px',color:'#B91C1C'}}>{errors.singkatan[0]}</span>}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                <label style={{fontSize:'12.5px',fontWeight:'700',color:'#475569'}}>Nomor Telepon Dinas</label>
                <input type="text" value={form.nomor_telepon} onChange={handleFormChange('nomor_telepon')} placeholder="Misal: 021-8758xxx"
                  style={{padding:'10px 14px',borderRadius:'8px',border:'1px solid #CBD5E1',fontSize:'13.5px',fontFamily:'inherit',outline:'none'}} />
                {errors.nomor_telepon && <span style={{fontSize:'12px',color:'#B91C1C'}}>{errors.nomor_telepon[0]}</span>}
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                <label style={{fontSize:'12.5px',fontWeight:'700',color:'#475569'}}>Batas Kuota / Hari</label>
                <input type="number" min="1" max="50" value={form.kuota_per_hari} onChange={handleFormChange('kuota_per_hari')} placeholder="Default: 2"
                  style={{padding:'10px 14px',borderRadius:'8px',border:'1px solid #CBD5E1',fontSize:'13.5px',fontFamily:'inherit',outline:'none'}} />
                {errors.kuota_per_hari && <span style={{fontSize:'12px',color:'#B91C1C'}}>{errors.kuota_per_hari[0]}</span>}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                <label style={{fontSize:'12.5px',fontWeight:'700',color:'#475569'}}>Latitude (Opsional)</label>
                <input type="number" step="any" value={form.latitude} onChange={handleFormChange('latitude')} placeholder="Misal: -6.4831"
                  style={{padding:'10px 14px',borderRadius:'8px',border:'1px solid #CBD5E1',fontSize:'13.5px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}} />
                {errors.latitude && <span style={{fontSize:'12px',color:'#B91C1C'}}>{errors.latitude[0]}</span>}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                <label style={{fontSize:'12.5px',fontWeight:'700',color:'#475569'}}>Longitude (Opsional)</label>
                <input type="number" step="any" value={form.longitude} onChange={handleFormChange('longitude')} placeholder="Misal: 106.8288"
                  style={{padding:'10px 14px',borderRadius:'8px',border:'1px solid #CBD5E1',fontSize:'13.5px',fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box'}} />
                {errors.longitude && <span style={{fontSize:'12px',color:'#B91C1C'}}>{errors.longitude[0]}</span>}
              </div>
            </div>

            <div style={{gridColumn:'1/-1',display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'4px'}}>
              <button type="button" onClick={()=>setShowForm(false)}
                style={{background:'white',border:'1px solid #CBD5E1',borderRadius:'8px',padding:'10px 18px',minHeight:'42px',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
                Batal
              </button>
              <button type="submit" disabled={submitting}
                style={{background:submitting?'#94A3B8':'#0028B3',color:'white',border:'none',borderRadius:'8px',padding:'10px 24px',minHeight:'42px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 8px rgba(0,40,179,0.2)'}}>
                {submitting?'Menyimpan...':(editId?'Simpan Perubahan':'Tambah Dinas')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dinas Table */}
      <div style={{background:'white',borderRadius:'16px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',border:'1px solid rgba(228, 231, 237, 0.8)',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #E4E7ED',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h3 style={{fontSize:'15px',fontWeight:'700',color:'#0F172A'}}>Daftar Instansi Dinas</h3>
          <span style={{fontSize:'12.5px',color:'#64748B',fontWeight:'500'}}>{filteredData.length} dinas</span>
        </div>

        {loading ? (
          <div style={{padding:'36px',textAlign:'center',color:'#64748B',fontSize:'13.5px'}}>Memuat data dinas...</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {(isSuperAdmin
                    ? ['Nama Instansi','Singkatan','Nomor Telepon','Kuota Harian','Latitude','Longitude','Aksi']
                    : ['Nama Instansi','Singkatan','Nomor Telepon','Kuota Harian','Latitude','Longitude']
                  ).map(h=>(
                    <th key={h} style={{background:'#F8FAFC',padding:'12px 16px',fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.6px',textAlign:'left',whiteSpace:'nowrap',borderBottom:'1px solid #E2E8F0'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} style={{padding:'32px',textAlign:'center',color:'#64748B',fontSize:'13.5px'}}>Tidak ada data dinas ditemukan.</td>
                  </tr>
                ) : (
                  filteredData.map(item => (
                    <tr key={item.id} style={{borderBottom:'1px solid #F1F5F9',transition:'background 0.2s'}}>
                      <td style={{padding:'14px 16px',fontSize:'13.5px',fontWeight:'600',color:'#0F172A'}}>{item.nama}</td>
                      <td style={{padding:'14px 16px',fontSize:'13px',color:'#475569'}}>{item.singkatan}</td>
                      <td style={{padding:'14px 16px',fontSize:'13px',color:'#0028B3',fontWeight:'600'}}>{item.nomor_telepon || '-'}</td>
                      <td style={{padding:'14px 16px',fontSize:'13px'}}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#EFF6FF',
                          color: '#0028B3',
                          border: '1px solid #BFDBFE',
                          fontWeight: 700,
                          fontSize: '11.5px',
                        }}>
                          {item.kuota_per_hari ?? 2} Rombongan/Hari
                        </span>
                      </td>
                      <td style={{padding:'14px 16px',fontSize:'13px',color:'#475569'}}>{item.latitude !== null ? item.latitude : '-'}</td>
                      <td style={{padding:'14px 16px',fontSize:'13px',color:'#475569'}}>{item.longitude !== null ? item.longitude : '-'}</td>
                      {isSuperAdmin && (
                        <td style={{padding:'14px 16px',whiteSpace:'nowrap'}}>
                          <div style={{display:'flex',gap:'8px'}}>
                            <button onClick={()=>handleOpenEdit(item)}
                              style={{background:'#EFF6FF',border:'none',borderRadius:'6px',color:'#0028B3',padding:'6px 12px',fontSize:'12.5px',fontWeight:'700',cursor:'pointer'}}>
                              Edit
                            </button>
                            <button onClick={()=>handleDelete(item.id)}
                              style={{background:'#FEF2F2',border:'none',borderRadius:'6px',color:'#B91C1C',padding:'6px 12px',fontSize:'12.5px',fontWeight:'700',cursor:'pointer'}}>
                              Hapus
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
