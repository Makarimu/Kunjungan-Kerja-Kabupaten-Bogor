import { useState } from 'react';
import { exportPermohonan } from '../api/admin/permohonan';

const STATUS_OPTIONS = [
  { label: 'Semua', value: 'Semua' },
  { label: 'Menunggu (Pending)', value: 'Pending' },
  { label: 'Diproses (Revisi)', value: 'Revisi' },
  { label: 'Disetujui', value: 'Disetujui' },
  { label: 'Ditolak', value: 'Ditolak' },
  { label: 'Selesai', value: 'Selesai' },
];

export default function ExportPermohonanModal({ onClose }: { onClose: () => void }) {
  const [rentang, setRentang] = useState<'semua' | 'tanggal'>('semua');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>(['Semua']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleStatus = (val: string) => {
    if (val === 'Semua') {
      setSelectedStatus(['Semua']);
      return;
    }
    setSelectedStatus((prev) => {
      const filtered = prev.filter((s) => s !== 'Semua');
      if (filtered.includes(val)) {
        const next = filtered.filter((s) => s !== val);
        return next.length === 0 ? ['Semua'] : next;
      }
      return [...filtered, val];
    });
  };

  const handleDownload = async () => {
    setError('');

    // Validate date range
    if (rentang === 'tanggal') {
      if (!startDate || !endDate) {
        setError('Tanggal awal dan tanggal akhir wajib diisi.');
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setError('Tanggal akhir harus sama atau setelah tanggal awal.');
        return;
      }
    }

    setLoading(true);
    try {
      const filters: any = { rentang };
      if (rentang === 'tanggal') {
        filters.start_date = startDate;
        filters.end_date   = endDate;
      }
      if (!selectedStatus.includes('Semua')) {
        filters.status = selectedStatus;
      }

      const response = await exportPermohonan(filters);

      // Check if response is JSON (error from backend)
      const contentType = String(response.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result as string);
            setError(json.message || 'Tidak ada data yang dapat diexport.');
          } catch {
            setError('Tidak ada data yang dapat diexport.');
          }
        };
        reader.readAsText(response.data as Blob);
        return;
      }

      // Determine filename from Content-Disposition header or generate one
      const disposition = response.headers['content-disposition'] || '';
      let filename = 'permohonan_kunjungan.xlsx';
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      // Try to parse blob error response
      if (err.response?.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = JSON.parse(reader.result as string);
            setError(json.message || 'Gagal mengunduh file.');
          } catch {
            setError('Gagal mengunduh file.');
          }
        };
        reader.readAsText(err.response.data);
      } else {
        setError(err.response?.data?.message || 'Gagal mengunduh file. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',boxSizing:'border-box'}}>
      {/* Overlay */}
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,17,120,0.3)',backdropFilter:'blur(3px)'}}/>

      {/* Modal Card */}
      <div style={{position:'relative',width:'480px',maxWidth:'95vw',background:'white',boxShadow:'var(--shadow-modal)',borderRadius:'20px',display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header */}
        <div style={{padding:'18px 22px',borderBottom:'1px solid #E8EDF0',display:'flex',alignItems:'center',justifyContent:'space-between',background:'white',borderRadius:'20px 20px 0 0'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#C5DBFF',color:'#0028B3',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:'1px solid rgba(0,40,179,0.2)'}}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div>
              <div style={{fontWeight:'800',fontSize:'15px',color:'#001178'}}>Export Data Permohonan</div>
              <div style={{fontSize:'12px',color:'#64748B'}}>Unduh dalam format Excel (.xlsx)</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Tutup"
            style={{background:'#F1F5F9',border:'none',color:'#475569',width:'30px',height:'30px',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{padding:'22px',display:'flex',flexDirection:'column',gap:'20px',maxHeight:'70vh',overflowY:'auto'}}>

          {/* Rentang Data */}
          <div>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>Rentang Data</div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {[{val:'semua',label:'Semua Data'},{val:'tanggal',label:'Berdasarkan Tanggal'}].map(opt => (
                <label key={opt.val} style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',fontSize:'13.5px',fontWeight:'600',color:'#334155'}}>
                  <input type="radio" name="rentang" value={opt.val} checked={rentang===opt.val}
                    onChange={() => setRentang(opt.val as 'semua'|'tanggal')}
                    style={{width:'16px',height:'16px',accentColor:'#0028B3',cursor:'pointer'}}/>
                  {opt.label}
                </label>
              ))}
            </div>

            {/* Date Range Inputs */}
            {rentang === 'tanggal' && (
              <div style={{marginTop:'14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:'6px'}}>Tanggal Awal</label>
                  <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                    style={{width:'100%',padding:'10px 12px',minHeight:'42px',border:'1px solid #D9DEE5',borderRadius:'8px',fontSize:'13.5px',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:'6px'}}>Tanggal Akhir</label>
                  <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                    style={{width:'100%',padding:'10px 12px',minHeight:'42px',border:'1px solid #D9DEE5',borderRadius:'8px',fontSize:'13.5px',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#64748B',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>Status</div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {STATUS_OPTIONS.map(opt => (
                <label key={opt.value} style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',fontSize:'13.5px',fontWeight:'600',color:'#334155'}}>
                  <input type="checkbox" checked={selectedStatus.includes(opt.value)}
                    onChange={() => toggleStatus(opt.value)}
                    style={{width:'16px',height:'16px',accentColor:'#0028B3',cursor:'pointer'}}/>
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:'8px',padding:'12px 14px',fontSize:'13px',color:'#991B1B',display:'flex',gap:'8px',alignItems:'flex-start'}}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:'1px'}}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div style={{padding:'16px 22px',borderTop:'1px solid #E8EDF0',display:'flex',gap:'12px',background:'white',borderRadius:'0 0 20px 20px'}}>
          <button onClick={onClose} disabled={loading}
            style={{flex:'none',background:'white',border:'1px solid #CBD5E1',borderRadius:'8px',padding:'10px 20px',minHeight:'42px',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit',color:'#334155'}}>
            Batal
          </button>
          <button onClick={handleDownload} disabled={loading}
            style={{flex:1,background:loading?'#94A3B8':'#0028B3',color:'white',border:'none',borderRadius:'8px',padding:'10px 20px',minHeight:'42px',fontSize:'13px',fontWeight:'700',cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',transition:'all 0.2s',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',boxShadow:'0 2px 8px rgba(0,40,179,0.2)'}}>
            {loading ? (
              <>
                <div style={{width:'15px',height:'15px',border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
                Memproses...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download Spreadsheet
              </>
            )}
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
