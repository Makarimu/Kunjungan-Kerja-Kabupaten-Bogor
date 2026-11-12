import React, { useState, useEffect, useMemo, startTransition } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';

interface AdminUser {
  id: number;
  username: string;
  nama: string;
  role: 'superadmin' | 'admin_dinas';
  dinas_id: number | null;
  dinas?: {
    id: number;
    nama: string;
    singkatan: string;
  } | null;
  is_active: boolean;
  created_at: string;
}

interface DinasOption {
  id: number;
  nama: string;
  singkatan: string;
}

const EMPTY_FORM = {
  username: '',
  nama: '',
  password: '',
  dinas_id: '',
};

export default function ManajemenAdmin() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [dinasOptions, setDinasOptions] = useState<DinasOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
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
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setData(res.data.data);
      } else {
        showToast(res.data.message || 'Gagal memuat data admin.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat memuat data admin.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDinasOptions = async () => {
    try {
      const res = await api.get('/dinas');
      if (res.data.success) {
        setDinasOptions(res.data.data);
      }
    } catch {
      console.error('Gagal mengambil pilihan dinas.');
    }
  };

  useEffect(() => {
    fetchData();
    fetchDinasOptions();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm && !submitting) {
        setShowForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, submitting]);

  const filteredData = useMemo(() => {
    const query = search.toLowerCase();
    return data.filter(admin => 
      admin.username.toLowerCase().includes(query) || 
      admin.nama.toLowerCase().includes(query) ||
      (admin.dinas?.nama && admin.dinas.nama.toLowerCase().includes(query)) ||
      (admin.dinas?.singkatan && admin.dinas.singkatan.toLowerCase().includes(query))
    );
  }, [data, search]);

  const handleOpenAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  const handleOpenEdit = (item: AdminUser) => {
    setEditId(item.id);
    setForm({
      username: item.username,
      nama: item.nama,
      password: '', // Keamanan: kosongkan password saat edit
      dinas_id: item.dinas_id !== null ? item.dinas_id.toString() : '',
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
        username: form.username,
        nama: form.nama,
        password: form.password || null,
        dinas_id: form.dinas_id ? parseInt(form.dinas_id) : null,
      };

      const res = editId
        ? await api.put(`/admin/users/${editId}`, payload)
        : await api.post('/admin/users', payload);

      if (res.data.success) {
        showToast(res.data.message || 'Akun admin berhasil disimpan.', 'success');
        setShowForm(false);
        setForm(EMPTY_FORM);
        fetchData();
      } else {
        showToast(res.data.message || 'Gagal menyimpan akun admin.', 'error');
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
    if (!window.confirm('Apakah Anda yakin ingin menghapus akun admin ini?')) {
      return;
    }

    try {
      const res = await api.delete(`/admin/users/${id}`);
      if (res.data.success) {
        showToast('Akun admin berhasil dihapus.', 'success');
        fetchData();
      } else {
        showToast(res.data.message || 'Gagal menghapus akun admin.', 'error');
      }
    } catch {
      showToast('Gagal menghapus data karena kesalahan jaringan.', 'error');
    }
  };

  return (
    <AdminLayout>
      <style>{`
        .user-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 600px) {
          .user-form-grid { grid-template-columns: 1fr; }
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
          <h2 style={{fontSize:'22px',fontWeight:'800',color:'#001178',letterSpacing:'-0.3px'}}>Manajemen Akun Admin</h2>
          <p style={{fontSize:'13.5px',color:'#64748B',marginTop:'3px'}}>Kelola akun admin untuk masing-masing instansi dinas Kabupaten Bogor</p>
        </div>
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
          <span>Buat Admin Baru</span>
        </button>
      </div>

      {/* Search Filter */}
      <div style={{background:'white',padding:'16px 20px',borderRadius:'16px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',border:'1px solid rgba(228, 231, 237, 0.8)',marginBottom:'20px',display:'flex',alignItems:'center',gap:'12px'}}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input 
          type="text"
          placeholder="Cari akun berdasarkan nama, username, atau dinas..."
          value={search}
          onChange={(e) => startTransition(() => setSearch(e.target.value))}
          style={{flex:1,border:'none',outline:'none',fontSize:'14px',color:'#1E293B',fontFamily:'inherit'}}
        />
      </div>

      {/* Modal Popup Tambah/Edit Admin */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setShowForm(false);
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '560px',
              overflow: 'hidden',
              animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ padding: '16px 20px', background: '#0028B3', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>
                {editId ? 'Edit Akun Admin' : 'Buat Akun Admin Baru'}
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>Nama Lengkap *</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={handleFormChange('nama')}
                  placeholder="Nama lengkap admin..."
                  required
                  style={{ padding: '10px 14px', borderRadius: '8px', border: errors.nama ? '1px solid #B91C1C' : '1px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'inherit', outline: 'none' }}
                />
                {errors.nama && <span style={{ fontSize: '12px', color: '#B91C1C' }}>{errors.nama[0]}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>Username *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={handleFormChange('username')}
                  placeholder="Username untuk login..."
                  required
                  style={{ padding: '10px 14px', borderRadius: '8px', border: errors.username ? '1px solid #B91C1C' : '1px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'inherit', outline: 'none' }}
                />
                {errors.username && <span style={{ fontSize: '12px', color: '#B91C1C' }}>{errors.username[0]}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>
                  Password {editId ? <span style={{ fontWeight: 'normal', color: '#94A3B8' }}>(Biarkan kosong jika tidak diubah)</span> : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={handleFormChange('password')}
                  placeholder="Min. 6 karakter..."
                  required={!editId}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: errors.password ? '1px solid #B91C1C' : '1px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'inherit', outline: 'none' }}
                />
                {errors.password && <span style={{ fontSize: '12px', color: '#B91C1C' }}>{errors.password[0]}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>Hak Akses Instansi (Dinas)</label>
                <select
                  value={form.dinas_id}
                  onChange={handleFormChange('dinas_id')}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: errors.dinas_id ? '1px solid #B91C1C' : '1px solid #CBD5E1', fontSize: '13.5px', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                >
                  <option value="">Super Admin (Akses Semua Instansi)</option>
                  {dinasOptions.map(d => (
                    <option key={d.id} value={d.id}>{d.nama} ({d.singkatan})</option>
                  ))}
                </select>
                {errors.dinas_id && <span style={{ fontSize: '12px', color: '#B91C1C' }}>{errors.dinas_id[0]}</span>}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 18px', minHeight: '42px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: submitting ? '#94A3B8' : '#0028B3', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 24px', minHeight: '42px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,40,179,0.2)' }}
                >
                  {submitting ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Buat Akun')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Table */}
      <div style={{background:'white',borderRadius:'16px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',border:'1px solid rgba(228, 231, 237, 0.8)',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #E4E7ED',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h3 style={{fontSize:'15px',fontWeight:'700',color:'#0F172A'}}>Daftar Akun Admin</h3>
          <span style={{fontSize:'12.5px',color:'#64748B',fontWeight:'500'}}>{filteredData.length} akun</span>
        </div>

        {loading ? (
          <div style={{padding:'36px',textAlign:'center',color:'#64748B',fontSize:'13.5px'}}>Memuat data admin...</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Nama Admin','Username','Hak Akses / Instansi','Status Akun','Aksi'].map(h=>(
                    <th key={h} style={{background:'#F8FAFC',padding:'12px 16px',fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.6px',textAlign:'left',whiteSpace:'nowrap',borderBottom:'1px solid #E2E8F0'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{padding:'32px',textAlign:'center',color:'#64748B',fontSize:'13.5px'}}>Tidak ada akun admin ditemukan.</td>
                  </tr>
                ) : (
                  filteredData.map(item => (
                    <tr key={item.id} style={{borderBottom:'1px solid #F1F5F9',transition:'background 0.2s'}}>
                      <td style={{padding:'14px 16px',fontSize:'13.5px',fontWeight:'600',color:'#0F172A'}}>{item.nama}</td>
                      <td style={{padding:'14px 16px',fontSize:'13px',color:'#64748B'}}>{item.username}</td>
                      <td style={{padding:'14px 16px',fontSize:'13px',color:item.dinas_id ? '#0F172A' : '#0028B3',fontWeight:item.dinas_id ? 'normal' : '700'}}>
                        {item.dinas ? `${item.dinas.nama} (${item.dinas.singkatan})` : 'Super Admin (Akses Global)'}
                      </td>
                      <td style={{padding:'14px 16px',fontSize:'12px',whiteSpace:'nowrap'}}>
                        <span style={{background:'#ECFDF5',color:'#059669',padding:'4px 8px',borderRadius:'100px',fontWeight:'700'}}>Aktif</span>
                      </td>
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
