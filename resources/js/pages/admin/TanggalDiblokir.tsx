import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../layouts/AdminLayout';
import { getAllTanggalDiblokir, blokirTanggal, bukaBlokirTanggal } from '../../api/admin/tanggalDiblokir';

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatTanggalFull(s) {
  if (!s) return '-';
  try { const d = new Date(s); return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`; }
  catch { return s; }
}

export default function KelolaKalender() {
  const { user } = useAuth();
  const isSuperAdmin = user?.dinas_id === null;
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formKet, setFormKet] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calendar state
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState('');

  const showToast = (msg, type='success') => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
  try {
    const res = await getAllTanggalDiblokir();
    setData(res.data || res || []);
  } catch {
    showToast('Gagal memuat data', 'error');
  } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const blockedDates = new Set(data.map(d => d.tanggal?.split('T')[0] || d.tanggal));

  const handleCalendarClick = (dateStr) => {
    setSelectedDate(dateStr);
    setFormDate(dateStr);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formDate) { showToast('Tanggal wajib dipilih', 'error'); return; }
    setSubmitting(true);
    try {
      await blokirTanggal({ tanggal: formDate, keterangan: formKet });
      showToast('Tanggal berhasil diblokir!');
      setShowForm(false); setFormDate(''); setFormKet(''); setSelectedDate('');
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.tanggal?.[0] || 'Gagal memblokir tanggal';
      showToast(msg, 'error');
    } finally { setSubmitting(false); }
  };

  const handleHapus = async (tgl) => {
    if (!confirm('Yakin ingin membuka blokir tanggal ini?')) return;
    try {
      await bukaBlokirTanggal(tgl);
      showToast('Blokir tanggal berhasil dibuka!');
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal membuka blokir';
      showToast(msg, 'error');
    }
  };

  // Render calendar
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getDayClass = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return 'weekend';
    if (d < today && d.toDateString() !== today.toDateString()) return 'past';
    if (blockedDates.has(dateStr)) return 'blocked';
    return 'available';
  };

  const dayStyle = (cls, isSelected) => {
    const base = {
      width:'38px', height:'38px', borderRadius:'9px', display:'flex', alignItems:'center',
      justifyContent:'center', fontSize:'13px', fontWeight:'600', cursor:'default', margin:'2px', transition:'all 0.15s'
    };
    if (isSelected) return { ...base, background:'#0028B3', color:'white', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,40,179,0.3)' };
    if (cls === 'blocked') return { ...base, background:'#FEE2E2', color:'#B91C1C', border:'1px solid #FCA5A5', cursor:'pointer' };
    if (cls === 'available') return { ...base, background:'#C5DBFF', color:'#001178', cursor:'pointer' };
    if (cls === 'weekend') return { ...base, background:'#F1F5F9', color:'#94A3B8', border:'1px solid #E2E8F0', cursor:'not-allowed' };
    return { ...base, background:'#FAFAFA', color:'#CBD5E1', border:'1px dashed #E2E8F0' };
  };

  return (
    <AdminLayout>
      <style>{`
        .kalender-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .kalender-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      {toast && (
        <div style={{position:'fixed',bottom:'24px',right:'24px',padding:'12px 20px',borderRadius:'10px',color:'white',fontSize:'13.5px',fontWeight:'600',zIndex:9999,boxShadow:'var(--shadow-lg)',background:toast.type==='error'?'#B91C1C':'#001178'}}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:'24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h2 style={{fontSize:'22px',fontWeight:'800',color:'#001178',letterSpacing:'-0.3px'}}>Kelola Kalender</h2>
          <p style={{fontSize:'13.5px',color:'#64748B',marginTop:'3px'}}>Blokir atau buka tanggal untuk kunjungan kerja</p>
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={() => { setShowForm(true); setFormDate(''); setSelectedDate(''); }}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 18px',minHeight:'42px',border:'none',borderRadius:'8px',background:'#0028B3',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:'700',fontFamily:'inherit',boxShadow:'0 2px 8px rgba(0,40,179,0.2)'}}>
            + Blokir Tanggal
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
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                Pengaturan Publik
              </button>
            </>
          )}
        </div>
      </div>

      <div className="kalender-grid">
        {/* Kalender */}
        <div style={{background:'white',borderRadius:'16px',boxShadow:'var(--shadow-sm)',border:'1px solid rgba(228, 231, 237, 0.8)',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #E4E7ED',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <button onClick={()=>{const d=new Date(viewDate);d.setMonth(d.getMonth()-1);setViewDate(d);}}
              style={{width:'36px',height:'36px',borderRadius:'8px',border:'1px solid #CBD5E1',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',color:'#334155'}}>
              ‹
            </button>
            <span style={{fontSize:'16px',fontWeight:'800',color:'#0F172A'}}>{MONTHS_ID[month]} {year}</span>
            <button onClick={()=>{const d=new Date(viewDate);d.setMonth(d.getMonth()+1);setViewDate(d);}}
              style={{width:'36px',height:'36px',borderRadius:'8px',border:'1px solid #CBD5E1',background:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',color:'#334155'}}>
              ›
            </button>
          </div>
          <div style={{padding:'20px'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px',marginBottom:'6px'}}>
              {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d=>(
                <div key={d} style={{textAlign:'center',fontSize:'11px',fontWeight:'700',color:'#64748B',padding:'6px 0',textTransform:'uppercase',letterSpacing:'0.5px'}}>{d}</div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px'}}>
              {Array.from({length:firstDay},(_,i)=><div key={'e'+i}/>)}
              {Array.from({length:daysInMonth},(_,i)=>{
                const day = i+1;
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const cls = getDayClass(dateStr);
                const isSelected = selectedDate === dateStr;
                const isClickable = cls === 'available' || cls === 'blocked';
                return (
                  <div key={dateStr} style={{display:'flex',justifyContent:'center',alignItems:'center'}}>
                    <div
                      style={dayStyle(cls, isSelected)}
                      title={cls==='blocked'?'Klik untuk buka blokir':cls==='available'?'Klik untuk blokir':''}
                      onClick={() => {
                        if (!isClickable) return;
                        if (cls === 'blocked') {
                          if(confirm(`Buka blokir tanggal ${formatTanggalFull(dateStr)}?`)){
                            handleHapus(dateStr);
                          }
                        } else {
                          handleCalendarClick(dateStr);
                        }
                      }}>
                      {day}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legenda */}
            <div style={{display:'flex',gap:'16px',flexWrap:'wrap',marginTop:'18px',paddingTop:'14px',borderTop:'1px solid #E4E7ED'}}>
              {[
                {color:'#C5DBFF',border:'1px solid #1883FF',label:'Tersedia'},
                {color:'#FEE2E2',border:'1px solid #FCA5A5',label:'Diblokir'},
                {color:'#F1F5F9',border:'1px solid #E2E8F0',label:'Weekend (Libur)',textColor:'#64748B'},
              ].map(l=>(
                <div key={l.label} style={{display:'flex',alignItems:'center',gap:'7px'}}>
                  <div style={{width:'14px',height:'14px',borderRadius:'4px',background:l.color,border:l.border||'1px solid #E2E8F0',flexShrink:0}}/>
                  <span style={{fontSize:'12px',color:l.textColor||'#475569',fontWeight:'600'}}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel kanan: Form + Daftar Blokir */}
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          {/* Form Blokir */}
          {showForm && (
            <div style={{background:'white',borderRadius:'16px',boxShadow:'var(--shadow-md)',border:'1.5px solid #0028B3',overflow:'hidden'}}>
              <div style={{padding:'16px 20px',background:'#0028B3',color:'white'}}>
                <div style={{fontSize:'15px',fontWeight:'700'}}>Blokir Tanggal</div>
                <div style={{fontSize:'12px',opacity:0.85,marginTop:'2px'}}>Tanggal yang diblokir tidak dapat dipilih pemohon</div>
              </div>
              <form onSubmit={handleSubmit} style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:'14px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:'6px'}}>Tanggal *</label>
                  <input type="date" value={formDate} onChange={e=>setFormDate(e.target.value)} required
                    style={{width:'100%',padding:'10px 12px',minHeight:'42px',border:'1px solid #D9DEE5',borderRadius:'8px',fontSize:'13.5px',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:'6px'}}>Keterangan / Alasan</label>
                  <input type="text" value={formKet} onChange={e=>setFormKet(e.target.value)}
                    placeholder="Contoh: Libur Nasional / Rapat Internal"
                    style={{width:'100%',padding:'10px 12px',minHeight:'42px',border:'1px solid #D9DEE5',borderRadius:'8px',fontSize:'13.5px',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
                <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                  <button type="button" onClick={()=>setShowForm(false)}
                    style={{flex:'none',background:'white',border:'1px solid #CBD5E1',borderRadius:'8px',padding:'10px 18px',minHeight:'42px',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
                    Batal
                  </button>
                  <button type="submit" disabled={submitting}
                    style={{flex:1,background:submitting?'#94A3B8':'#0028B3',color:'white',border:'none',borderRadius:'8px',padding:'10px',minHeight:'42px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 8px rgba(0,40,179,0.2)'}}>
                    {submitting?'Menyimpan...':'Blokir Tanggal'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Daftar Diblokir */}
          <div style={{background:'white',borderRadius:'16px',boxShadow:'var(--shadow-sm)',border:'1px solid rgba(228, 231, 237, 0.8)',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #E4E7ED',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#0F172A'}}>Daftar Tanggal Diblokir</div>
              <span style={{background:'#FEE2E2',color:'#B91C1C',border:'1px solid #FCA5A5',borderRadius:'20px',padding:'3px 12px',fontSize:'11.5px',fontWeight:'700'}}>
                {data.length} tanggal
              </span>
            </div>
            {loading ? (
              <div style={{padding:'28px',textAlign:'center',color:'#64748B',fontSize:'13.5px'}}>Memuat data...</div>
            ) : data.length === 0 ? (
              <div style={{padding:'32px 20px',textAlign:'center',color:'#64748B'}}>
                <div style={{fontSize:'32px',marginBottom:'8px'}}>📅</div>
                <div style={{fontSize:'13.5px'}}>Belum ada tanggal yang diblokir.</div>
              </div>
            ) : (
              <div style={{maxHeight:'380px',overflowY:'auto'}}>
                {data.map((item, i) => {
                  const tgl = item.tanggal?.split('T')[0] || item.tanggal;
                  return (
                    <div key={i} style={{padding:'14px 20px',borderTop:i>0?'1px solid #F1F5F9':'none',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px'}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:'13.5px',fontWeight:'700',color:'#B91C1C'}}>{formatTanggalFull(tgl)}</div>
                        <div style={{fontSize:'12px',color:'#64748B',marginTop:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.keterangan||'Tidak ada keterangan'}</div>
                        <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'2px'}}>oleh {item.diblokir_oleh||'Admin'}</div>
                      </div>
                      <button onClick={()=>handleHapus(tgl)}
                        style={{flexShrink:0,background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:'8px',padding:'7px 12px',fontSize:'11.5px',fontWeight:'700',color:'#B91C1C',cursor:'pointer',fontFamily:'inherit'}}>
                        Buka
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
