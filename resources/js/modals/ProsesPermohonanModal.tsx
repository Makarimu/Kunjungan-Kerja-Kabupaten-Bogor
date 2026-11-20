import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { prosesPermohonan, editPermohonanAdmin, hapusPermohonan, selesaikanPermohonan } from '../api/admin/permohonan';
import api from '../services/api';

// ==================== SHARED ====================
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function formatTanggal(s) {
  if (!s) return '-';
  try { const d = new Date(s); return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`; }
  catch { return s; }
}

function StatusBadge({ status, bisaRevisi }: any) {
  const cfg: any = {
    Pending: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'Menunggu' },
    Menunggu: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'Menunggu' },
    Disetujui: { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC', label: 'Disetujui' },
    Selesai: { bg: '#D1FAE5', color: '#065F46', border: '#059669', label: 'Selesai' },
    Ringkasan_Terkirim: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', label: 'Ringkasan Terkirim' },
    Ditolak: { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5', label: bisaRevisi === 'Ya' ? 'Ditolak (Bisa Revisi)' : 'Ditolak (Permanen)' },
    Revisi: { bg: '#FEF9C3', color: '#854D0E', border: '#FACC15', label: 'Revisi' },
  };
  const s = cfg[status] || cfg.Pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '12px',
      fontSize: '11px', fontWeight: '700', background: s.bg, color: s.color, border: `1px solid ${s.border}`
    }}>
      {s.label || status}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#222', fontWeight: '500' }}>{value || '-'}</span>
    </div>
  );
}

function DetailTile({ label, value }: any) {
  return (
    <div style={{ minWidth: 0, background: '#F8FAFC', border: '1px solid #EDF0F3', borderRadius: '7px', padding: '9px 10px' }}>
      <div style={{ fontSize: '8px', fontWeight: '700', color: '#7B8490', textTransform: 'uppercase', letterSpacing: '0.35px', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#26313D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '-'}</div>
    </div>
  );
}

function DetailSection({ title, children }: any) {
  return (
    <section style={{ background: '#fff', border: '1px solid #E8EDF0', borderRadius: '9px', padding: '11px', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: '#26313D', marginBottom: '9px' }}>{title}</div>
      {children}
    </section>
  );
}

// ==================== MODAL SETUJUI ====================
function ModalSetujui({ data, onClose, onSuccess }) {
  const [narasumber, setNarasumber] = useState(data.narasumber || '');
  const [jamPenerimaan, setJamPenerimaan] = useState(data.jam_penerimaan || '');
  const [keterangan, setKeterangan] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    setErr('');
    setLoading(true);
    try {
      await prosesPermohonan(data.kode, {
        aksi: 'acc', narasumber, jam_penerimaan: jamPenerimaan, keterangan
      });
      onSuccess('Permohonan berhasil disetujui!');
    } catch (e) {
      setErr(e.response?.data?.message || 'Terjadi kesalahan');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ borderRadius: '10px', background: '#C5DBFF', border: '1.5px solid #0028B3', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#001178', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        <span>Permohonan akan <strong>disetujui</strong> dan email notifikasi dikirim ke <strong>{data.email}</strong></span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Narasumber/Pejabat Penerima <span style={{ color: '#e74c3c' }}>*</span></label>
          <input type="text" value={narasumber} onChange={e => setNarasumber(e.target.value)}
            placeholder="Contoh: Kepala Bidang PBB" required
            style={{ width: '100%', border: '1px solid #D9DEE5', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Jam Penerimaan (WIB) <span style={{ color: '#e74c3c' }}>*</span></label>
          <input type="time" value={jamPenerimaan} onChange={e => setJamPenerimaan(e.target.value)} required
            style={{ width: '100%', border: '1px solid #D9DEE5', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Catatan Tambahan (Opsional)</label>
          <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} rows={3}
            placeholder="Pesan tambahan untuk pemohon..."
            style={{ width: '100%', border: '1px solid #D9DEE5', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        {err && <div style={{ color: '#e74c3c', fontSize: '13px', background: '#FEF2F2', padding: '10px 12px', borderRadius: '8px' }}>{err}</div>}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={onClose} style={{ flex: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
        <button onClick={handleSubmit} disabled={loading || !narasumber || !jamPenerimaan}
          style={{ flex: 1, background: loading || !narasumber || !jamPenerimaan ? '#aaa' : '#0028B3', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,40,179,0.2)' }}>
          {loading ? 'Memproses...' : '✓ Setujui & Kirim Email'}
        </button>
      </div>
    </div>
  );
}

// ==================== MODAL TOLAK ====================
function ModalTolak({ data, onClose, onSuccess }) {
  const [keterangan, setKeterangan] = useState('');
  const [bisaRevisi, setBisaRevisi] = useState('Ya');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    if (!keterangan.trim()) { setErr('Alasan penolakan wajib diisi'); return; }
    setErr('');
    setLoading(true);
    try {
      await prosesPermohonan(data.kode, {
        aksi: 'tolak', keterangan, bisa_revisi: bisaRevisi
      });
      onSuccess('Permohonan berhasil ditolak.');
    } catch (e) {
      setErr(e.response?.data?.message || 'Terjadi kesalahan');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ borderRadius: '10px', background: '#FDEDEC', border: '1.5px solid #e74c3c', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#922B21', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        <span>Permohonan akan <strong>ditolak</strong> dan email notifikasi dikirim ke <strong>{data.email}</strong></span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Alasan Penolakan <span style={{ color: '#e74c3c' }}>*</span></label>
          <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)} rows={4}
            placeholder="Jelaskan alasan penolakan secara detail kepada pemohon..."
            style={{ width: '100%', border: '1px solid #D9DEE5', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Boleh Mengajukan Revisi?</label>
          <div style={{ display: 'flex', gap: '14px' }}>
            {['Ya', 'Tidak'].map(v => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                <input
                  type="radio"
                  name="bisaRevisi"
                  value={v}
                  checked={bisaRevisi === v}
                  onChange={() => setBisaRevisi(v)}
                  style={{ width: '16px', height: '16px', accentColor: '#0028B3' }} />
                {v === 'Ya' ? 'Ya, Boleh Revisi' : 'Tidak (Tolak Permanen)'}
              </label>
            ))}
          </div>
        </div>
        {err && <div style={{ color: '#e74c3c', fontSize: '13px', background: '#FEF2F2', padding: '10px 12px', borderRadius: '8px' }}>{err}</div>}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={onClose} style={{ flex: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
        <button onClick={handleSubmit} disabled={loading}
          style={{ flex: 1, background: loading ? '#aaa' : '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
          {loading ? 'Memproses...' : '✕ Tolak & Kirim Email'}
        </button>
      </div>
    </div>
  );
}

// ==================== MODAL HAPUS ====================
function ModalHapus({ data, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await hapusPermohonan(data.kode);
      onSuccess('Permohonan berhasil dihapus.');
    } catch (e) {
      setErr(e.response?.data?.message || 'Terjadi kesalahan');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
        <div style={{ width: '60px', height: '60px', background: '#FDEDEC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
        </div>
        <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', marginBottom: '8px' }}>Hapus Permohonan?</p>
        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.6' }}>
          Permohonan <strong style={{ color: '#0028B3' }}>{data.kode}</strong> dari <strong>{data.instansi}</strong> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        {err && <div style={{ color: '#e74c3c', fontSize: '13px', background: '#FEF2F2', padding: '10px 12px', borderRadius: '8px', marginTop: '12px' }}>{err}</div>}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onClose} style={{ flex: 1, background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
        <button onClick={handleSubmit} disabled={loading}
          style={{ flex: 1, background: loading ? '#aaa' : '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'Menghapus...' : 'Ya, Hapus Permanen'}
        </button>
      </div>
    </div>
  );
}

// ==================== MODAL SELESAI ====================
function ModalSelesai({ data, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await selesaikanPermohonan(data.kode);
      onSuccess('Kunjungan berhasil diselesaikan dan email telah dikirim ke pemohon.');
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Terjadi kesalahan');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
        <div style={{ width: '60px', height: '60px', background: '#C5DBFF', border: '1px solid #0028B3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        </div>
        <p style={{ fontSize: '15px', fontWeight: '700', color: '#222', marginBottom: '8px' }}>Selesaikan Kunjungan Kerja?</p>
        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.6' }}>
          Kunjungan dengan kode <strong style={{ color: '#0028B3' }}>{data.kode}</strong> dari <strong>{data.instansi}</strong> akan dinyatakan <strong style={{ color: '#0028B3' }}>Selesai</strong>. Sistem akan otomatis mengirim email notifikasi ke <strong>{data.email}</strong> agar pemohon dapat mengisi Rating & Review.
        </p>
        {err && <div style={{ color: '#e74c3c', fontSize: '13px', background: '#FEF2F2', padding: '10px 12px', borderRadius: '8px', marginTop: '12px' }}>{err}</div>}
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onClose} style={{ flex: 1, background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
        <button onClick={handleSubmit} disabled={loading}
          style={{ flex: 1, background: loading ? '#aaa' : '#0028B3', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,40,179,0.2)' }}>
          {loading ? 'Memproses...' : '✓ Ya, Selesaikan Kunjungan'}
        </button>
      </div>
    </div>
  );
}

// ==================== MODAL EDIT ====================
function ModalEdit({ data, onClose, onSuccess }) {
  const [form, setForm] = useState({
    tanggal_kunjungan: data.tanggal_kunjungan?.split('T')[0] || '',
    nomor_surat: data.nomor_surat || '',
    nama_pic: data.nama_pic || '',
    instansi: data.instansi || '',
    jabatan_pic: data.jabatan_pic || '',
    no_telp: data.no_telp || '',
    email: data.email || '',
    tujuan: data.tujuan || '',
    dinas_tujuan: data.dinas_tujuan || '',
    dinas_id: data.dinas_id !== null && data.dinas_id !== undefined ? data.dinas_id.toString() : '',
    nama_ketua_rombongan: data.nama_ketua_rombongan || '',
    jabatan_ketua_rombongan: data.jabatan_ketua_rombongan || '',
    jumlah_peserta: data.jumlah_peserta || '1',
    rencana_menginap: data.rencana_menginap || 'Tidak',
    nama_hotel: data.nama_hotel || '',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [dinasOptions, setDinasOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchDinas = async () => {
      try {
        const res = await api.get('/dinas');
        if (res.data.success) {
          setDinasOptions(res.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDinas();
  }, []);

  const handleSubmit = async () => {
    setErr('');
    setLoading(true);
    try {
      await editPermohonanAdmin(data.kode, form);
      onSuccess('Data permohonan berhasil diperbarui.');
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Terjadi kesalahan');
    } finally { setLoading(false); }
  };

  const FField = ({ label, name, type = "text", required }: any) => (
    <div>
      <label style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>{label}{required && <span style={{ color: '#e74c3c' }}> *</span>}</label>
      <input type={type} value={form[name as keyof typeof form]} onChange={(e) => setForm((f: any) => ({ ...f, [name]: e.target.value }))}
        style={{ width: '100%', border: '1px solid #D9DEE5', borderRadius: '8px', padding: '8px 11px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <FField label="Tanggal Kunjungan" name="tanggal_kunjungan" type="date" required />
        <FField label="Nomor Surat" name="nomor_surat" required />
        <FField label="Nama Pemohon/PIC" name="nama_pic" required />
        <FField label="Instansi/Organisasi" name="instansi" required />
        <FField label="Jabatan PIC" name="jabatan_pic" required />
        <FField label="No. Telepon" name="no_telp" required />
        <FField label="Email" name="email" type="email" required />
        <FField label="Jumlah Peserta" name="jumlah_peserta" type="number" />
        <FField label="Nama Ketua Rombongan" name="nama_ketua_rombongan" required />
        <FField label="Jabatan Ketua Rombongan" name="jabatan_ketua_rombongan" required />
        <div>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Rencana Menginap *</label>
          <select
            value={form.rencana_menginap || 'Tidak'}
            onChange={(e) => setForm((f: any) => ({ ...f, rencana_menginap: e.target.value }))}
            style={{ width: '100%', border: '1px solid #D9DEE5', borderRadius: '8px', padding: '8px 11px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' }}
          >
            <option value="Tidak">Tidak Menginap</option>
            <option value="Ya">Ya, Berencana Menginap</option>
          </select>
        </div>
        {form.rencana_menginap === 'Ya' && (
          <FField label="Nama Hotel / Penginapan" name="nama_hotel" required />
        )}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Dinas Tujuan <span style={{ color: '#e74c3c' }}> *</span></label>
        <select 
          value={form.dinas_id || ''} 
          onChange={(e) => {
            const selectedId = e.target.value;
            const selectedDinas = dinasOptions.find(d => d.id.toString() === selectedId);
            setForm((f: any) => ({ 
              ...f, 
              dinas_id: selectedId,
              dinas_tujuan: selectedDinas ? selectedDinas.nama : ''
            }));
          }}
          style={{ width: '100%', border: '1px solid #D9DEE5', borderRadius: '8px', padding: '8px 11px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' }}
        >
          <option value="">-- Pilih Dinas Tujuan --</option>
          {dinasOptions.map(d => (
            <option key={d.id} value={d.id}>{d.nama} ({d.singkatan})</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Deskripsi Tujuan/Maksud Kunjungan <span style={{ color: '#e74c3c' }}>*</span></label>
        <textarea value={form.tujuan} onChange={e => setForm((f: any) => ({ ...f, tujuan: e.target.value }))} rows={3}
          style={{ width: '100%', border: '1px solid #D9DEE5', borderRadius: '8px', padding: '8px 11px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      {err && <div style={{ color: '#e74c3c', fontSize: '13px', background: '#FEF2F2', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px' }}>{err}</div>}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onClose} style={{ flex: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Batal</button>
        <button onClick={handleSubmit} disabled={loading}
          style={{ flex: 1, background: loading ? '#aaa' : '#0028B3', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,40,179,0.2)' }}>
          {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}

function DetailSectionRingkasanPdf({
  data,
  onUpdate,
  onUnsavedChange,
}: {
  data: any;
  onUpdate?: (updatedData: any) => void;
  onUnsavedChange?: (hasUnsaved: boolean) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  // Modal konfirmasi kirim
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // Notify parent if unsaved file exists
  useEffect(() => {
    onUnsavedChange?.(!!selectedFile);
  }, [selectedFile, onUnsavedChange]);

  // pdf_ready adalah satu-satunya gate — dari API
  const hasPdf = !!(data.pdf_ready || data.hasil_kunjungan_pdf || data.link_ringkasan_pdf || data.has_pdf);
  const pdfNamaFile = data.pdf_nama_file || data.pdf_filename || (data.hasil_kunjungan_pdf ? data.hasil_kunjungan_pdf.split('/').pop() : 'Ringkasan-Kunjungan.pdf');
  const pdfUploadedAt = data.pdf_uploaded_at || data.ringkasan_uploaded_at || data.hasil_kunjungan_uploaded_at;
  const pdfUkuranFile = data.pdf_ukuran_file || 'PDF Document';
  const pdfViewUrl = data.download_url || data.link_ringkasan_pdf || data.pdf_download_url || (data.kode ? `/api/permohonan/${data.kode}/download-pdf` : '#');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) {
      setErrorMsg('File harus berupa PDF dengan ukuran maksimal 10 MB.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }
    // Simpan sementara di state React — JANGAN langsung upload
    setSelectedFile(file);
  };

  const handleGantiFile = () => {
    setSelectedFile(null);
    setErrorMsg('');
    setSuccessMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleHapusFileLokal = () => {
    setSelectedFile(null);
    setErrorMsg('');
    setSuccessMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload ke server — dipanggil hanya setelah konfirmasi
  const handleUploadConfirmed = async () => {
    setShowConfirmSend(false);
    if (!selectedFile) return;
    setErrorMsg('');
    setSuccessMsg('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      const res = await api.post(`/admin/permohonan/${data.id || data.kode}/upload-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMsg('Ringkasan berhasil dikirim.');
      // Reset file lokal — tampilan sekarang berasal dari API
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onUpdate && res.data?.data) {
        onUpdate(res.data.data);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'File harus berupa PDF dengan ukuran maksimal 10 MB.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus PDF Ringkasan Hasil Kunjungan ini?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    setDeleting(true);

    try {
      const res = await api.delete(`/admin/permohonan/${data.id || data.kode}/delete-pdf`);
      setSuccessMsg('PDF ringkasan berhasil dihapus.');
      if (onUpdate && res.data?.data) {
        onUpdate(res.data.data);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus PDF ringkasan.');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  return (
    <DetailSection title="Ringkasan Hasil Kunjungan">
      {/* Modal Konfirmasi Kirim */}
      {showConfirmSend && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '28px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1E293B', marginBottom: '12px' }}>Kirim Ringkasan Hasil Kunjungan?</div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.7', marginBottom: '16px' }}>
              Anda akan mengirim file PDF ringkasan hasil kunjungan kepada pemohon.<br />
              Setelah dikirim:
            </p>
            <ul style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.8', marginBottom: '20px', paddingLeft: '18px' }}>
              <li>File akan tersimpan di sistem.</li>
              <li>Email akan dikirim otomatis kepada pemohon.</li>
              <li>Pemohon dapat mengunduh PDF melalui halaman Cek Status.</li>
            </ul>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#1E293B', marginBottom: '16px' }}>Apakah Anda yakin?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConfirmSend(false)}
                style={{ padding: '8px 18px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUploadConfirmed}
                style={{ padding: '8px 18px', borderRadius: '6px', background: '#0028B3', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: 'white', boxShadow: '0 2px 8px rgba(0,40,179,0.2)' }}
              >
                Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', marginBottom: '10px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', color: '#166534', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', marginBottom: '10px' }}>
          {successMsg}
        </div>
      )}

      {/* Tampilan jika PDF sudah ada di database (pdf_ready = true) */}
      {hasPdf && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B' }}>{pdfNamaFile}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Tanggal Upload: {formatTanggal(pdfUploadedAt)} {pdfUkuranFile ? `• Ukuran: ${pdfUkuranFile}` : ''}
              </div>
              <span style={{ display: 'inline-block', background: '#DCFCE7', color: '#15803D', padding: '1px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', marginTop: '3px' }}>
                Sudah dikirim
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            <a
              href={pdfViewUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: '#0028B3', color: 'white', fontSize: '11.5px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,40,179,0.2)' }}
            >
              Lihat PDF
            </a>
            <a
              href={pdfViewUrl}
              download="Ringkasan-Hasil-Kunjungan.pdf"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '11.5px', fontWeight: '700', textDecoration: 'none' }}
            >
              Download
            </a>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: '6px 12px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
            >
              {deleting ? 'Hapus...' : 'Hapus PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Area Upload / Ganti PDF */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
          {hasPdf ? 'Ganti PDF' : 'Upload PDF'}
        </label>

        {/* Input file — tersembunyi, dikontrol via ref */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {!selectedFile ? (
          /* Belum ada file dipilih */
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '7px 14px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
            >
              Pilih File PDF
            </button>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Belum ada file dipilih</span>
          </div>
        ) : (
          /* File sudah dipilih — tampilkan info + tombol aksi */
          <div>
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#15803D' }}>{selectedFile.name}</div>
                <div style={{ fontSize: '11px', color: '#4ADE80' }}>{formatFileSize(selectedFile.size)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleGantiFile}
                style={{ padding: '7px 14px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
              >
                Ganti File
              </button>
              <button
                type="button"
                onClick={handleHapusFileLokal}
                style={{ padding: '7px 14px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
              >
                Hapus File
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmSend(true)}
                disabled={uploading}
                style={{ padding: '7px 14px', borderRadius: '6px', background: uploading ? '#94A3B8' : '#0028B3', border: 'none', color: 'white', fontSize: '11.5px', fontWeight: '700', cursor: uploading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(0,40,179,0.2)' }}
              >
                {uploading ? 'Mengirim...' : 'Kirim Ringkasan'}
              </button>
            </div>
          </div>
        )}

        <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '8px' }}>
          Format: <strong>PDF</strong> | Maksimal: <strong>10 MB</strong>
        </div>
      </div>
    </DetailSection>
  );
}

// ==================== PANEL DETAIL (DRAWER) ====================
export default function ProsesPermohonanModal({ data: initialData, onClose, onSuccess, onUpdate }: any) {
  const [view, setView] = useState('detail'); // 'detail'|'setujui'|'tolak'|'edit'|'hapus'
  const [data, setData] = useState(initialData);
  const [hasUnsavedFile, setHasUnsavedFile] = useState(false);
  const [showConfirmCloseModal, setShowConfirmCloseModal] = useState(false);

  if (!data) return null;

  const handleUpdate = useCallback((updatedData: any) => {
    setData(updatedData);
    if (onUpdate) onUpdate(updatedData);
  }, [onUpdate]);

  const handleSuccess = useCallback((msg: any) => {
    onSuccess(msg);
    onClose();
  }, [onSuccess, onClose]);

  const handleCloseAttempt = () => {
    if (hasUnsavedFile) {
      setShowConfirmCloseModal(true);
    } else {
      onClose();
    }
  };

  const modalTitles = useMemo<any>(() => ({
    detail: 'Detail Permohonan',
    setujui: 'Setujui Permohonan',
    tolak: 'Tolak Permohonan',
    selesai: 'Selesaikan Kunjungan',
    edit: 'Edit Data Permohonan',
    hapus: 'Hapus Permohonan',
  }), []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
      {/* Dialog Konfirmasi Tutup saat file belum dikirim */}
      {showConfirmCloseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '380px', width: '100%', boxShadow: 'var(--shadow-modal)' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#92400E', marginBottom: '10px' }}>File belum dikirim</div>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.7', marginBottom: '20px' }}>
              Apakah Anda yakin ingin menutup?<br />
              <strong>Perubahan akan hilang.</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmCloseModal(false);
                  onClose();
                }}
                style={{ padding: '9px 18px', minHeight: '40px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#991B1B' }}
              >
                Tetap Tutup
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmCloseModal(false)}
                style={{ padding: '9px 18px', minHeight: '40px', borderRadius: '8px', background: '#0028B3', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: 'white' }}
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      <div onClick={handleCloseAttempt} style={{ position: 'absolute', inset: 0, background: 'rgba(0,17,120,0.3)', backdropFilter: 'blur(3px)' }} />
      {/* Kartu modal di tengah */}
      <div style={{ position: 'relative', width: view === 'detail' ? '680px' : '520px', maxWidth: '95vw', maxHeight: 'calc(100vh - 32px)', background: 'white', boxShadow: 'var(--shadow-modal)', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E8EDF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: view === 'detail' ? 'white' : '#0028B3', color: view === 'detail' ? '#202833' : 'white', flexShrink: 0, borderRadius: '20px 20px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {view !== 'detail' && (
              <button onClick={() => setView('detail')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
            )}
            {view === 'detail' && <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#C5DBFF', color: '#0028B3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(0,40,179,0.2)' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15h6M9 11h2" /></svg>
            </div>}
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px' }}>{modalTitles[view]}</div>
              <div style={{ fontSize: '11px', color: view === 'detail' ? '#0028B3' : 'inherit', opacity: view === 'detail' ? 1 : 0.8, fontWeight: view === 'detail' ? '700' : '400', fontFamily: 'monospace' }}>{data.kode}</div>
            </div>
          </div>
          <button onClick={handleCloseAttempt} aria-label="Tutup" style={{ background: view === 'detail' ? '#F4F6F8' : 'rgba(255,255,255,0.15)', border: 'none', color: view === 'detail' ? '#4B5563' : 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
        </div>

        {/* View: Detail */}
        {view === 'detail' && (
          <div style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC', padding: '16px 20px' }}>
            {/* Status + aksi cepat */}
            <div style={{ padding: '8px 4px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Status Permohonan</div>
                <StatusBadge status={data.status} bisaRevisi={data.bisa_direvisi || data.bisa_revisi} />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(data.status === 'Pending' || data.status === 'Revisi') && (
                  <>
                    <button onClick={() => setView('setujui')} style={{ background: '#0028B3', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 6px rgba(0,40,179,0.2)' }}>
                      ✓ Setujui
                    </button>
                    <button onClick={() => setView('tolak')} style={{ background: '#B91C1C', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✕ Tolak
                    </button>
                  </>
                )}
                {data.status === 'Disetujui' && (
                  <button onClick={() => setView('selesai')} style={{ background: '#0028B3', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 6px rgba(0,40,179,0.2)' }}>
                    ✓ Selesaikan Kunjungan
                  </button>
                )}
                <button onClick={() => setView('edit')} style={{ background: 'white', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 16px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✎ Edit
                </button>
                <button onClick={() => setView('hapus')} style={{ background: 'white', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 16px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗑 Hapus
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <DetailSection title="Identitas & Jadwal Kunjungan">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '7px' }}>
                <DetailTile label="Tanggal Kunjungan" value={formatTanggal(data.tanggal_kunjungan)} />
                <DetailTile label="Nomor Surat" value={data.nomor_surat} />
                <DetailTile label="Instansi" value={data.instansi} />
                <DetailTile label="Jumlah Peserta" value={data.jumlah_peserta ? `${data.jumlah_peserta} orang` : '-'} />
                <DetailTile label="Rencana Menginap" value={data.rencana_menginap} />
                <DetailTile label="Hotel/Penginapan" value={data.rencana_menginap === 'Ya' ? data.nama_hotel : '-'} />
              </div>
            </DetailSection>

            <div style={{ height: '8px' }} />
            <DetailSection title="Kontak Pemohon">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '7px' }}>
                <DetailTile label="Nama PIC" value={data.nama_pic} />
                <DetailTile label="Jabatan PIC" value={data.jabatan_pic} />
                <DetailTile label="No. Telepon" value={data.no_telp} />
                <DetailTile label="Email" value={data.email} />
                <DetailTile label="Ketua Rombongan" value={data.nama_ketua_rombongan} />
                <DetailTile label="Jabatan Ketua" value={data.jabatan_ketua_rombongan} />
              </div>
            </DetailSection>

            <div style={{ height: '8px' }} />
            <DetailSection title="Tujuan Kunjungan">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Dinas Tujuan</span>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#1E293B' }}>
                    {data.dinas_tujuan || '-'} 
                    {data.dinas?.nomor_telepon && <span style={{ color: '#0028B3', marginLeft: '6px', fontWeight: '600' }}>(Telp: {data.dinas.nomor_telepon})</span>}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Deskripsi Tujuan</span>
                  <div style={{ background: '#F0F8F1', border: '1px solid #DDEFE0', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: '#334155', lineHeight: '1.5' }}>{data.tujuan || '-'}</div>
                </div>
              </div>
            </DetailSection>

            {/* Dokumen */}
            <div style={{ height: '8px' }} />
            <DetailSection title="Dokumen Lampiran">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Surat Permohonan', url: data.surat_permohonan_url || data.link_surat_1 },
                  { label: 'Surat Daftar Pertanyaan', url: data.surat_daftar_pertanyaan_url || data.link_surat_2 },
                  { label: 'Bukti Menginap', url: data.bukti_menginap_url || data.link_bukti_menginap, optional: true },
                ].map(({ label, url, optional }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#F8FAFC', borderRadius: '7px', border: '1px solid #E8EDF0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#222' }}>{label}</span>
                    </div>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#0028B3', fontWeight: '700', textDecoration: 'none', border: '1px solid #0028B3', borderRadius: '4px', padding: '3px 7px', background: '#F0F7FF' }}>Lihat File</a>
                    ) : (
                      <span style={{ fontSize: '12px', color: optional ? '#AAB2BC' : '#e74c3c', fontStyle: 'italic' }}>{optional ? 'Belum diunggah' : 'Tidak ada'}</span>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>

            {/* Ringkasan Hasil Kunjungan (PDF) jika status Selesai */}
            {data.status === 'Selesai' && (
              <>
                <div style={{ height: '8px' }} />
                <DetailSectionRingkasanPdf
                  data={data}
                  onUpdate={handleUpdate}
                  onUnsavedChange={setHasUnsavedFile}
                />
              </>
            )}

            {/* Keterangan admin */}
            {data.keterangan_admin && (
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Keterangan Admin</div>
                <div style={{ background: '#F7F8FA', borderLeft: `3px solid ${data.status === 'Ditolak' ? '#B91C1C' : data.status === 'Disetujui' ? '#0028B3' : '#6D28D9'}`, borderRadius: '8px', padding: '12px 14px', fontSize: '13px', lineHeight: '1.7', color: '#444' }}>
                  {data.keterangan_admin}
                </div>
              </div>
            )}

            {/* Jika disetujui: jam & narasumber */}
            {data.status === 'Disetujui' && (
              <div style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Info Kunjungan</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <DetailRow label="Narasumber" value={data.narasumber} />
                  <DetailRow label="Jam Penerimaan" value={data.jam_penerimaan} />
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'setujui' && <ModalSetujui data={data} onClose={() => setView('detail')} onSuccess={handleSuccess} />}
        {view === 'tolak' && <ModalTolak data={data} onClose={() => setView('detail')} onSuccess={handleSuccess} />}
        {view === 'selesai' && <ModalSelesai data={data} onClose={() => setView('detail')} onSuccess={handleSuccess} />}
        {view === 'edit' && <ModalEdit data={data} onClose={() => setView('detail')} onSuccess={handleSuccess} />}
        {view === 'hapus' && <ModalHapus data={data} onClose={() => setView('detail')} onSuccess={handleSuccess} />}
      </div>
    </div>
  );
}
