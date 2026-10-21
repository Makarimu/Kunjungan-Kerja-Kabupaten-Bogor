import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../layouts/AdminLayout';
import { getAllPermohonan } from '../../api/admin/permohonan';
import DetailPermohonanPanel from '../../modals/ProsesPermohonanModal';
import ExportPermohonanModal from '../../modals/ExportPermohonanModal';

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatDisplayDate(s: any) {
  if (!s) return '-';
  try { const d = new Date(s); return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`; }
  catch { return s; }
}

const STATUS_TABS = ['Semua','Pending','Revisi','Disetujui','Selesai','Ditolak'];
const STATUS_COLORS: any = { Revisi:'#CA8A04', Ditolak:'#B91C1C', Disetujui:'#16A34A', Pending:'#475569', Menunggu:'#475569', Selesai:'#065F46', Semua:'#0028B3' };
const TABLE_HEADERS = ['Kode Permohonan','Instansi/Pemohon','Tgl Kunjungan','Peserta','Status','Aksi'];

const STATUS_BADGE_CFG: any = {
  Pending: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'Menunggu' },
  Menunggu: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'Menunggu' },
  Disetujui: { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC', label: 'Disetujui' },
  Ditolak: { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5', label: 'Ditolak' },
  Revisi: { bg: '#FEF9C3', color: '#854D0E', border: '#FACC15', label: 'Revisi' },
  Selesai: { bg: '#D1FAE5', color: '#065F46', border: '#059669', label: 'Selesai' },
};

const StatusBadge = memo(function StatusBadge({ status }: any) {
  const s: any = STATUS_BADGE_CFG[status] || STATUS_BADGE_CFG.Pending;
  return (
    <span style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:'12px',fontSize:'11px',fontWeight:'700',background:s.bg,color:s.color,border:`1px solid ${s.border}`,whiteSpace:'nowrap'}}>
      {s.label || status}
    </span>
  );
});

export default function KelolaPermohonan() {
  const { user } = useAuth();
  const isSuperAdmin = user?.dinas_id === null;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Semua');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);
  const [showExport, setShowExport] = useState(false);
  const searchTimer = useRef<any>(null);
  const searchRef = useRef('');

  const isMountedRef = useRef(true);

  const showToast = useCallback((msg: any, type='success') => {
    setToast({msg, type});
    setTimeout(() => {
      if (isMountedRef.current) setToast(null);
    }, 3500);
  }, []);

  const fetchData = useCallback(async (f: any) => {
    setLoading(true);
    try {
      const params: any = {
        page: f.page || 1,
        per_page: 15
      };
      if (f.status && f.status !== 'Semua') params.status = f.status;
      if (f.search) params.search = f.search;
      if (f.start_date) params.start_date = f.start_date;
      if (f.end_date) params.end_date = f.end_date;

      const res = await getAllPermohonan(params);
      if (isMountedRef.current) {
        setData(res.data || []);
        if (res.meta) setMeta(res.meta);
      }
    } catch (e) {
      console.error(e);
      if (isMountedRef.current) showToast('Gagal memuat data permohonan', 'error');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setPage(1);
    const f = { status: tab, search: searchRef.current, start_date: startDate, end_date: endDate, page: 1 };
    fetchData(f);

    return () => {
      isMountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [tab, startDate, endDate, fetchData]);

  const handleSearchChange = useCallback((val: any) => {
    setSearch(val);
    searchRef.current = val;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchData({ status: tab, search: val, start_date: startDate, end_date: endDate, page: 1 });
    }, 400);
  }, [tab, startDate, endDate, fetchData]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    fetchData({ status: tab, search: searchRef.current, start_date: startDate, end_date: endDate, page: newPage });
  }, [tab, startDate, endDate, fetchData]);

  const loadData = useCallback(() => {
    setTab('Semua'); setSearch(''); searchRef.current = ''; setStartDate(''); setEndDate(''); setPage(1);
    fetchData({ status:'Semua', search:'', start_date:'', end_date:'', page: 1 });
  }, [fetchData]);

  const handleSuccess = useCallback((msg: any) => {
    showToast(msg);
    setSelected(null);
    fetchData({ status: tab, search, start_date: startDate, end_date: endDate });
  }, [showToast, tab, search, startDate, endDate, fetchData]);

  return (
    <AdminLayout>
      <style>{`
        .permohonan-header {
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .permohonan-filter-bar {
          background: white;
          border-radius: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,.06);
          border: 1px solid #E5E7EB;
          padding: 14px 18px;
          margin-bottom: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-end;
        }
        .permohonan-search { flex: 1 1 220px; min-width: 0; }
        .permohonan-date-filter { flex: 0 0 auto; min-width: 140px; max-width: 100%; }
        @media (max-width: 480px) {
          .permohonan-date-filter { flex: 1 1 100%; }
        }
      `}</style>
      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:'20px',right:'20px',padding:'11px 18px',borderRadius:'8px',color:'white',fontSize:'13px',fontWeight:'500',zIndex:9999,maxWidth:'320px',boxShadow:'0 4px 16px rgba(0,17,120,0.18)',background:toast.type==='error'?'#B91C1C':'#001178'}}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:'24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h2 style={{fontSize:'22px',fontWeight:'800',color:'#001178',letterSpacing:'-0.3px'}}>Kelola Permohonan</h2>
          <p style={{fontSize:'13.5px',color:'#64748B',marginTop:'3px'}}>Proses dan kelola permohonan kunjungan kerja</p>
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={() => setShowExport(true)}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',minHeight:'42px',border:'1px solid #0028B3',borderRadius:'8px',background:'#0028B3',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:'700',fontFamily:'inherit',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(0,40,179,0.2)'}}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Unduh Spreadsheet
          </button>
          <button onClick={loadData}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',minHeight:'42px',border:'1px solid #E4E7ED',borderRadius:'8px',background:'white',color:'#334155',cursor:'pointer',fontSize:'13px',fontWeight:'600',fontFamily:'inherit',boxShadow:'var(--shadow-xs)',transition:'all 0.2s'}}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset Filter
          </button>
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

      {/* Tab Status */}
      <div style={{display:'flex',gap:'8px',marginBottom:'18px',flexWrap:'wrap'}}>
        {STATUS_TABS.map((t: any) => (
          <button key={t} onClick={() => setTab(t)}
            style={{padding:'8px 18px',borderRadius:'20px',fontSize:'12.5px',fontWeight:'700',cursor:'pointer',border:'1.5px solid',transition:'all 0.2s',fontFamily:'inherit',
              background: tab===t ? (STATUS_COLORS[t]||'#0028B3') : 'white',
              color: tab===t ? 'white' : '#64748B',
              borderColor: tab===t ? (STATUS_COLORS[t]||'#0028B3') : '#E5E7EB',
              boxShadow: tab===t ? '0 2px 8px rgba(0,40,179,0.2)' : 'none',
            }}>
            {t === 'Pending' ? 'Menunggu' : t}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{background:'white',borderRadius:'16px',boxShadow:'var(--shadow-sm)',border:'1px solid rgba(228, 231, 237, 0.8)',padding:'18px 20px',marginBottom:'20px',display:'flex',flexWrap:'wrap',gap:'14px',alignItems:'flex-end'}}>
        <div style={{flex:'1 1 240px'}}>
          <label style={{fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:'6px'}}>Pencarian</label>
          <div style={{position:'relative'}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',color:'#94A3B8'}}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input type="text" placeholder="Kode, instansi, nama PIC..." value={search}
              onChange={e => handleSearchChange(e.target.value)}
              style={{width:'100%',paddingLeft:'36px',paddingRight:'14px',paddingTop:'10px',paddingBottom:'10px',minHeight:'42px',border:'1px solid #D9DEE5',borderRadius:'8px',fontSize:'13.5px',fontFamily:'inherit',boxSizing:'border-box'}}/>
          </div>
        </div>
        <div style={{flex:'0 0 160px'}}>
          <label style={{fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:'6px'}}>Dari Tanggal</label>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
            style={{width:'100%',padding:'9px 12px',minHeight:'42px',border:'1px solid #D9DEE5',borderRadius:'8px',fontSize:'13px',fontFamily:'inherit',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:'0 0 160px'}}>
          <label style={{fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:'6px'}}>Sampai Tanggal</label>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
            style={{width:'100%',padding:'9px 12px',minHeight:'42px',border:'1px solid #D9DEE5',borderRadius:'8px',fontSize:'13px',fontFamily:'inherit',boxSizing:'border-box'}}/>
        </div>
      </div>

      {/* Table */}
      <div style={{background:'white',borderRadius:'16px',boxShadow:'var(--shadow-sm)',border:'1px solid rgba(228, 231, 237, 0.8)',overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid #E4E7ED',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h3 style={{fontSize:'15px',fontWeight:'700',color:'#0F172A'}}>Daftar Permohonan</h3>
          <span style={{fontSize:'12.5px',color:'#64748B',fontWeight:'500'}}>{loading?'Memuat...':data.length+' data'}</span>
        </div>

        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Kode Permohonan','Instansi/Pemohon','Tgl Kunjungan','Peserta','Status','Aksi'].map(h => (
                  <th key={h} style={{background:'#F8FAFC',padding:'12px 16px',fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.6px',textAlign:'left',whiteSpace:'nowrap',borderBottom:'1px solid #E2E8F0'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{textAlign:'center',padding:'48px 20px'}}>
                    <div style={{display:'inline-block',width:'32px',height:'32px',border:'3px solid #C5DBFF',borderTopColor:'#0028B3',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                    <div style={{marginTop:'12px',color:'#64748B',fontSize:'13.5px'}}>Memuat data...</div>
                    <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{textAlign:'center',padding:'48px 20px',color:'#64748B',fontSize:'13.5px'}}>
                    <div style={{fontSize:'32px',marginBottom:'8px'}}>📋</div>
                    Tidak ada data permohonan.
                  </td>
                </tr>
              ) : data.map((d: any, i: any) => (
                <tr key={d.id || i} style={{borderTop:'1px solid #F1F5F9',transition:'background 0.15s',cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  onClick={() => setSelected(d)}>
                  <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:'700',color:'#0028B3',fontFamily:'monospace',whiteSpace:'nowrap'}}>
                    {d.kode}
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{fontSize:'13.5px',fontWeight:'600',color:'#0F172A'}}>{d.instansi}</div>
                    <div style={{fontSize:'12px',color:'#64748B',marginTop:'2px'}}>PIC: {d.nama_pic}</div>
                  </td>
                  <td style={{padding:'12px 16px',fontSize:'13px',color:'#334155',whiteSpace:'nowrap'}}>{formatDisplayDate(d.tanggal_kunjungan)}</td>
                  <td style={{padding:'12px 16px',fontSize:'13px',textAlign:'center',color:'#334155',fontWeight:'600'}}>{d.jumlah_peserta}</td>
                  <td style={{padding:'12px 16px'}}>
                    <StatusBadge status={d.status}/>
                    {d.status === 'Selesai' && (
                      <div style={{marginTop:'4px',fontSize:'10px',fontWeight:'600',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'3px',color: (d.pdf_ready || d.ringkasan_pdf || d.ringkasan_uploaded_at) ? '#16A34A' : '#D97706'}}>
                        {(d.pdf_ready || d.ringkasan_pdf || d.ringkasan_uploaded_at) ? '🟢 PDF sudah dikirim' : '🟡 PDF belum dikirim'}
                      </div>
                    )}
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(d); }}
                      style={{padding:'7px 16px',border:'1px solid #E2E8F0',borderRadius:'8px',fontSize:'12.5px',fontWeight:'600',cursor:'pointer',background:'#F8FAFC',color:'#334155',transition:'all 0.2s',fontFamily:'inherit'}}>
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{padding:'14px 20px',borderTop:'1px solid #E4E7ED',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px',fontSize:'13px',color:'#64748B'}}>
          <div>
            {meta ? (
              <>Menampilkan <strong>{meta.from || 0}</strong> - <strong>{meta.to || 0}</strong> dari <strong>{meta.total || 0}</strong> data</>
            ) : (
              <>Menampilkan <strong>{data.length}</strong> data</>
            )}
          </div>

          {meta && meta.last_page > 1 && (
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <button
                disabled={page <= 1 || loading}
                onClick={() => handlePageChange(page - 1)}
                style={{
                  padding:'7px 14px',
                  border:'1px solid #CBD5E1',
                  borderRadius:'8px',
                  background: page <= 1 || loading ? '#F1F5F9' : 'white',
                  color: page <= 1 || loading ? '#94A3B8' : '#334155',
                  cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
                  fontWeight:'600',
                  fontSize:'12.5px',
                  fontFamily:'inherit'
                }}>
                ‹ Sebelumnya
              </button>

              {Array.from({ length: meta.last_page }, (_, i) => i + 1)
                .filter(p => p === 1 || p === meta.last_page || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <span key={p} style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                      {showEllipsis && <span style={{color:'#94A3B8',padding:'0 2px'}}>...</span>}
                      <button
                        onClick={() => handlePageChange(p)}
                        disabled={loading}
                        style={{
                          padding:'7px 13px',
                          border: page === p ? '1px solid #0028B3' : '1px solid #CBD5E1',
                          borderRadius:'8px',
                          background: page === p ? '#0028B3' : 'white',
                          color: page === p ? 'white' : '#334155',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontWeight: page === p ? '700' : '600',
                          fontSize:'12.5px',
                          fontFamily:'inherit'
                        }}>
                        {p}
                      </button>
                    </span>
                  );
                })}

              <button
                disabled={page >= meta.last_page || loading}
                onClick={() => handlePageChange(page + 1)}
                style={{
                  padding:'7px 14px',
                  border:'1px solid #CBD5E1',
                  borderRadius:'8px',
                  background: page >= meta.last_page || loading ? '#F1F5F9' : 'white',
                  color: page >= meta.last_page || loading ? '#94A3B8' : '#334155',
                  cursor: page >= meta.last_page || loading ? 'not-allowed' : 'pointer',
                  fontWeight:'600',
                  fontSize:'12.5px',
                  fontFamily:'inherit'
                }}>
                Selanjutnya ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <DetailPermohonanPanel
          data={selected}
          onClose={() => setSelected(null)}
          onSuccess={handleSuccess}
          onUpdate={(updatedData: any) => {
            setSelected(updatedData);
            setData((prevList: any[]) =>
              prevList.map((item) => (item.id === updatedData.id || item.kode === updatedData.kode ? updatedData : item))
            );
          }}
        />
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportPermohonanModal onClose={() => setShowExport(false)} />
      )}
    </AdminLayout>
  );
}
