import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import api from '../services/api';
import { loadRecaptchaScript, resetRecaptchaPromise } from '../services/recaptcha';
import { getRecaptchaSiteKey } from '../utils/url';
import SearchableDinasSelect from '../components/SearchableDinasSelect';


// ---- Static Constants (keluar dari komponen agar tidak dibuat ulang setiap render) ----
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const STAR_NUMBERS = [1, 2, 3, 4, 5];
const DROPDOWN_OPTIONS = [{ value: 'Ya', label: 'Ya' }, { value: 'Tidak', label: 'Tidak' }];
const STEP_LABELS = ['Pilih Dinas', 'Pilih Tanggal', 'Data Pemohon', 'Konfirmasi', 'Detail Kunjungan'];
const LEGEND_DOT_STYLE_TERSEDIA = { background: '#C5DBFF', border: '1.5px solid #1883FF' };
const LEGEND_DOT_STYLE_USER_BOOKED = { background: '#FEF3C7', border: '1.5px solid #F59E0B' };
const LEGEND_DOT_STYLE_BLOCKED = { background: 'repeating-linear-gradient(-45deg, #F1F5F9, #F1F5F9 2.5px, #CBD5E1 2.5px, #CBD5E1 5.5px)', border: '1.5px solid #64748B' };
const LEGEND_DOT_STYLE_TERPAKAI = { background: '#FEE2E2', border: '1.5px solid #EF4444' };
const LEGEND_DOT_STYLE_TIDAK = { background: '#F8FAFC', border: '1.5px solid #CBD5E1' };
const INITIAL_FORM = {
  instansi: '', namaPic: '', jabatanPic: '',
  noTelp: '', email: '', tujuan: '', dinasId: '', dinasTujuan: '', namaKetuaRombongan: '',
  jabatanKetuaRombongan: '', jumlahPeserta: '', rencanaMenginap: '', namaHotel: '', nomorSurat: '',
};
// Style pesan validasi inline
const ERR_MSG_STYLE: React.CSSProperties = { color: '#B91C1C', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' };
// Urutan field yang akan digulung saat ada error pertama
const FIELD_ORDER = ['nomorSurat', 'namaPic', 'instansi', 'jabatanPic', 'noTelp', 'email', 'dinasId', 'tujuan', 'namaKetuaRombongan', 'jabatanKetuaRombongan', 'jumlahPeserta', 'rencanaMenginap', 'namaHotel', 'file1', 'file2'];

function formatDate(date: any) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(s: any) {
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${parseInt(d)} ${MONTHS_ID[parseInt(m) - 1]} ${y}`;
}

// ---- Calendar Component — React.memo untuk isolasi dari re-render form ----
const Calendar = memo(function Calendar({
  busyDates = [],
  blockedDates = [],
  blockedDetails = {},
  fullDates = [],
  approvedVisits = {},
  selectedDate,
  onSelect,
  minDateStr,
  userBookedDates = []
}: any) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = useMemo(() => formatDate(today), [today]);
  const minDate = useMemo(() => {
    if (minDateStr) {
      const [y, m, d] = minDateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [minDateStr]);

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [pinnedDate, setPinnedDate] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.cal-day') && !target.closest('.cal-day-popup-anchor')) {
        setPinnedDate(null);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const handleClosePopup = useCallback(() => {
    setPinnedDate(null);
    setHoveredDate(null);
  }, []);

  const prevMonth = useCallback(() => {
    setPinnedDate(null);
    setHoveredDate(null);
    setViewDate(d => {
      const next = new Date(d);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setPinnedDate(null);
    setHoveredDate(null);
    setViewDate(d => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [year, month]);

  const getDayClass = useCallback((dateStr: string, dayOfWeek: number) => {
    const date = new Date(dateStr + 'T00:00:00');
    // Hari sudah lewat — selalu tampilkan sebagai past terlepas dari status lain
    if (date < today) return 'past';
    // Akhir pekan — tidak tersedia
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'weekend';
    // Sudah diajukan oleh email yang sedang digunakan — PRIORITAS UTAMA sebelum busy/too-soon/available
    if (userBookedDates.includes(dateStr)) return 'user-booked';
    // Diblokir oleh Admin Dinas — warna ungu
    if (blockedDates.includes(dateStr)) return 'blocked';
    // Kuota penuh (>= 2 kunjungan) — warna merah
    if (fullDates.includes(dateStr) || busyDates.includes(dateStr)) return 'busy';
    // Terlalu dekat (H+1 belum terpenuhi)
    if (date < minDate) return 'too-soon';
    return 'available';
  }, [userBookedDates, blockedDates, fullDates, busyDates, minDate, today]);

  return (
    <div className="card" style={{ overflow: 'visible' }}>
      <div className="card-header cal-card-header">
        <h3>Jadwal Ketersediaan</h3>
      </div>
      <div className="card-body" style={{ overflow: 'visible' }}>
        <div className="cal-nav">
          <button onClick={prevMonth}>&#8249;</button>
          <span className="cal-month">{MONTHS_ID[month]} {year}</span>
          <button onClick={nextMonth}>&#8250;</button>
        </div>
        <div className="cal-grid">
          {DAYS_ID.map(d => <div key={d} className="cal-day-header">{d}</div>)}
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="cal-day empty" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dow = new Date(dateStr + 'T00:00:00').getDay();
            const cls = getDayClass(dateStr, dow);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            const detail = blockedDetails[dateStr];
            const visitsOnDay = approvedVisits[dateStr] || [];
            const isPopupOpen = (pinnedDate === dateStr) || (!pinnedDate && hoveredDate === dateStr);
            return (
              <CalendarDay
                key={dateStr}
                dateStr={dateStr}
                day={day}
                dow={dow}
                cls={cls}
                detail={detail}
                visitsOnDay={visitsOnDay}
                isSelected={isSelected}
                isToday={isToday}
                isPopupOpen={isPopupOpen}
                onSelect={onSelect}
                onHover={setHoveredDate}
                onTogglePin={setPinnedDate}
                onClosePopup={handleClosePopup}
              />
            );
          })}
        </div>
        <div className="cal-legend">
          <div className="legend-item">
            <div className="legend-dot" style={LEGEND_DOT_STYLE_TERSEDIA} />
            <span>Tersedia</span>
          </div>
          <div className="legend-item">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1px 5px',
              borderRadius: '4px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#0028B3',
              fontSize: '9px',
              fontWeight: '800',
              lineHeight: '1.1'
            }}>
              ACC
            </span>
            <span>Tamu Disetujui</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={LEGEND_DOT_STYLE_USER_BOOKED} />
            <span>Maksimal 2x Kunjungan Dinas</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={LEGEND_DOT_STYLE_BLOCKED} />
            <span>Diblokir oleh Dinas</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={LEGEND_DOT_STYLE_TERPAKAI} />
            <span>Terpakai (Penuh)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={LEGEND_DOT_STYLE_TIDAK} />
            <span>Tidak Tersedia</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// CalendarDay diisolasi agar hanya hari yang berubah yang re-render
const CalendarDay = memo(function CalendarDay({
  dateStr,
  day,
  dow,
  cls,
  detail,
  visitsOnDay = [],
  isSelected,
  isToday,
  isPopupOpen,
  onSelect,
  onHover,
  onTogglePin,
  onClosePopup
}: any) {
  const hasApprovedVisits = Array.isArray(visitsOnDay) && visitsOnDay.length > 0;
  const isInteractive = cls === 'blocked' || cls === 'busy' || cls === 'user-booked' || hasApprovedVisits;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (cls === 'available') {
      onSelect(dateStr);
      if (hasApprovedVisits) {
        onTogglePin((prev: string | null) => (prev === dateStr ? null : dateStr));
      }
    } else if (isInteractive) {
      onTogglePin((prev: string | null) => (prev === dateStr ? null : dateStr));
    }
  }, [cls, dateStr, isInteractive, hasApprovedVisits, onSelect, onTogglePin]);

  const handleMouseEnter = useCallback(() => {
    if (isInteractive) {
      onHover(dateStr);
    }
  }, [isInteractive, onHover, dateStr]);

  const handleMouseLeave = useCallback(() => {
    if (isInteractive) {
      onHover((prev: string | null) => (prev === dateStr ? null : prev));
    }
  }, [isInteractive, onHover, dateStr]);

  return (
    <div
      className={`cal-day ${cls}${isSelected && cls !== 'user-booked' ? ' selected' : ''}${isToday ? ' today' : ''}${hasApprovedVisits ? ' has-guest' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        zIndex: isPopupOpen ? 200 : (isSelected ? 3 : 1),
      }}
    >
      <span style={{ position: 'relative', ...(hasApprovedVisits ? { transform: 'translateY(-4px)' } : {}) }}>
        {day}
      </span>

      {hasApprovedVisits && (
        <span
          className="cal-day-guest-badge"
          title={`${visitsOnDay.length} Rombongan Tamu Disetujui (ACC)`}
          style={{
            position: 'absolute',
            bottom: '2px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1.5px',
            fontSize: '8px',
            fontWeight: '800',
            lineHeight: '1',
            padding: '1px 3.5px',
            borderRadius: '4px',
            background: cls === 'busy' ? '#FEE2E2' : '#EFF6FF',
            color: cls === 'busy' ? '#B91C1C' : '#0028B3',
            border: `1px solid ${cls === 'busy' ? '#FECACA' : '#BFDBFE'}`,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 2,
          }}
        >
          {visitsOnDay.length} ACC
        </span>
      )}

      {isPopupOpen && (
        <div
          className="cal-day-popup-anchor"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            zIndex: 250,
            ...(dow <= 1 ? { left: '0' } : dow >= 5 ? { right: '0' } : { left: '50%', transform: 'translateX(-50%)' }),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="cal-day-popup-card">
            {cls === 'blocked' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '7px',
                      background: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      flexShrink: 0
                    }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155', letterSpacing: '-0.2px' }}>
                      Tanggal Diblokir
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClosePopup}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '3px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '5px',
                      transition: 'background 0.15s ease'
                    }}
                    title="Tutup Popup"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span>{formatDisplayDate(dateStr)}</span>
                </div>

                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderLeft: '3.5px solid #64748B',
                  borderRadius: '7px',
                  padding: '8px 10px',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>
                    Keterangan:
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#1E293B', fontWeight: '600', wordBreak: 'break-word', lineHeight: '1.45' }}>
                    "{detail?.keterangan || 'Agenda internal dinas'}"
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px', fontSize: '10.5px', color: '#64748B' }}>
                  <span>Oleh: <strong style={{ color: '#475569' }}>{detail?.diblokir_oleh || 'Admin Dinas'}</strong></span>
                  <span style={{ color: '#DC2626', fontWeight: '600' }}>Tidak Tersedia</span>
                </div>
              </>
            ) : cls === 'busy' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '7px',
                      background: '#FEE2E2',
                      color: '#B91C1C',
                      flexShrink: 0
                    }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#B91C1C', letterSpacing: '-0.2px' }}>
                      Jadwal Penuh {visitsOnDay.length > 0 ? `(${visitsOnDay.length}/2 ACC)` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClosePopup}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '3px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '5px'
                    }}
                    title="Tutup Popup"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span>{formatDisplayDate(dateStr)}</span>
                </div>

                {visitsOnDay.length > 0 ? (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px' }}>
                      Tamu Terjadwal (ACC):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto' }}>
                      {visitsOnDay.map((visit: any, vIdx: number) => (
                        <div key={vIdx} style={{
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderLeft: '3.5px solid #DC2626',
                          borderRadius: '6px',
                          padding: '6px 8px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#991B1B', lineHeight: '1.3' }}>
                              {visit.instansi}
                            </span>
                            {visit.jam_penerimaan && (
                              <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#B91C1C', background: '#FEE2E2', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                                {visit.jam_penerimaan}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>Ketua: <strong style={{ color: '#1E293B' }}>{visit.nama_tamu}</strong></span>
                            {visit.jumlah_peserta > 0 && <span>• <strong>{visit.jumlah_peserta} Orang</strong></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderLeft: '3.5px solid #EF4444',
                    borderRadius: '7px',
                    padding: '8px 10px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#991B1B', lineHeight: '1.45' }}>
                      Kuota kunjungan kerja pada tanggal ini sudah penuh (maksimal 2 rombongan per hari). Silakan pilih tanggal lain.
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '10.5px', color: '#DC2626', fontWeight: '600', textAlign: 'right' }}>
                  Tidak Tersedia
                </div>
              </>
            ) : cls === 'user-booked' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '7px',
                      background: '#FEF3C7',
                      color: '#B45309',
                      flexShrink: 0
                    }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                      </svg>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#B45309', letterSpacing: '-0.2px' }}>
                      Sudah Diajukan
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClosePopup}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '3px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '5px'
                    }}
                    title="Tutup Popup"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span>{formatDisplayDate(dateStr)}</span>
                </div>

                <div style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderLeft: '3.5px solid #F59E0B',
                  borderRadius: '7px',
                  padding: '8px 10px',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: '#92400E', lineHeight: '1.45' }}>
                    Email Anda sudah mencapai batas maksimal 2 pengajuan kunjungan untuk dinas ini pada tanggal tersebut.
                  </div>
                </div>
              </>
            ) : hasApprovedVisits ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '7px',
                      background: '#EFF6FF',
                      color: '#0028B3',
                      flexShrink: 0
                    }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0028B3', letterSpacing: '-0.2px' }}>
                      Tersedia (Sisa {Math.max(1, 2 - visitsOnDay.length)} Kuota)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClosePopup}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '3px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '5px'
                    }}
                    title="Tutup Popup"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span>{formatDisplayDate(dateStr)}</span>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px' }}>
                    Tamu yang Sudah Disetujui (ACC):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto' }}>
                    {visitsOnDay.map((visit: any, vIdx: number) => (
                      <div key={vIdx} style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderLeft: '3.5px solid #0028B3',
                        borderRadius: '6px',
                        padding: '6px 8px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#001178', lineHeight: '1.3' }}>
                            {visit.instansi}
                          </span>
                          {visit.jam_penerimaan && (
                            <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#0028B3', background: '#DBEAFE', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                              {visit.jam_penerimaan}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>Ketua: <strong style={{ color: '#1E293B' }}>{visit.nama_tamu}</strong></span>
                          {visit.jumlah_peserta > 0 && <span>• <strong>{visit.jumlah_peserta} Orang</strong></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px' }}>
                  <span style={{ color: '#059669', fontWeight: '600' }}>✓ Masih Tersedia</span>
                  <span style={{ color: '#0028B3', fontWeight: '700' }}>Klik untuk memilih</span>
                </div>
              </>
            ) : null}
            <div className={`cal-popup-arrow arrow-${dow <= 1 ? 'left' : dow >= 5 ? 'right' : 'center'}`} />
          </div>
        </div>
      )}
    </div>
  );
});

// ---- Step Indicator — React.memo agar tidak re-render saat form berubah ----
const StepIndicator = memo(function StepIndicator({ step }: any) {
  return (
    <div className="step-indicator" id="stepIndicator">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const isActive = n === step;
        const isDone = n < step;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            <div className="step" style={{ gap: '7px' }}>
              <div className={`step-num${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>{n}</div>
              <span className={`step-label${isActive ? ' active' : ''}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className={`step-line${isDone ? ' done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
});

// ---- Custom Dropdown — React.memo + useCallback ----
const CustomDropdown = memo(function CustomDropdown({ value, onChange, error }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: any) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = useMemo(() => DROPDOWN_OPTIONS.find(o => o.value === value), [value]);
  const toggleOpen = useCallback(() => setOpen(v => !v), []);

  return (
    <div className={`custom-select${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`custom-select-trigger${error ? ' error' : ''}`}
        onClick={toggleOpen}
      >
        {selected
          ? <span>{selected.label}</span>
          : <span className="custom-select-placeholder">Pilih...</span>
        }
        <svg className="custom-select-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="custom-select-options">
        {DROPDOWN_OPTIONS.map(o => (
          <DropdownOption
            key={o.value}
            option={o}
            isSelected={value === o.value}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        ))}
      </div>
    </div>
  );
});

const DropdownOption = memo(function DropdownOption({ option, isSelected, onChange, onClose }: any) {
  const handleClick = useCallback(() => {
    onChange(option.value);
    onClose();
  }, [onChange, onClose, option.value]);

  return (
    <div
      className={`custom-select-option${isSelected ? ' selected' : ''}`}
      onClick={handleClick}
    >
      {option.label}
    </div>
  );
});

// ---- Upload Area — React.memo ----
const UploadArea = memo(function UploadArea({ file, onChange, error, id }: any) {
  const handleClick = useCallback(() => {
    document.getElementById(id)?.click();
  }, [id]);

  return (
    <div
      className={`upload-area${file ? ' has-file' : ''}${error ? ' error' : ''}`}
      onClick={handleClick}
    >
      <input
        type="file"
        id={id}
        style={{ display: 'none' }}
        accept=".pdf"
        onChange={onChange}
      />
      <div className="upload-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07L14.36 3.88a3.54 3.54 0 0 1 5 5L10.5 17.74a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </div>
      <div className="upload-text"><strong>Klik untuk upload</strong><br />PDF (Maks. 10 MB)</div>
      {file && (
        <div style={{ marginTop: '6px', fontSize: '12px', color: '#0028B3', fontWeight: '600' }}>{file.name}</div>
      )}
    </div>
  );
});

// ---- Disclaimer Modal — React.memo ----
const DisclaimerModal = memo(function DisclaimerModal({ open, onClose, minHari = 1 }: any) {
  const [checked, setChecked] = useState(false);
  const handleCheck = useCallback((e: any) => setChecked(e.target.checked), []);
  return (
    <div className={`modal-overlay${open ? ' active' : ''}`}>
      <div className="modal" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h3>Ketentuan Kunjungan Kerja</h3>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '12.5px', color: 'var(--text-sub)', marginBottom: '12px', lineHeight: '1.6' }}>
            Sebelum mengajukan permohonan, harap baca dan pahami ketentuan berikut:
          </p>
          <ol className="disclaimer-list">
            <li>Kunjungan kerja dilaksanakan pada hari Senin s.d. Jum'at.</li>
            <li>Surat permohonan disampaikan paling lambat {minHari} hari sebelum kegiatan.</li>
            <li>Kunjungan lebih dari 1 hari <strong>DIWAJIBKAN MENGINAP di hotel wilayah Kabupaten Bogor.</strong></li>
            <li>Pelanggaran ketentuan mengakibatkan permohonan tidak dapat diterima.</li>
          </ol>
          <div style={{ margin: '14px 0', padding: '10px 14px', background: '#EEF2FF', borderRadius: '10px', border: '1px solid rgba(0, 40, 179, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-sub)', fontWeight: 500 }}>
              Dokumen Dasar: <strong>SE Bupati Bogor No. 727 Th 2025</strong>
            </span>
            <a
              href="/dokumen/surat-edaran-727.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '12px',
                color: '#0028B3',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Lihat PDF Surat Edaran &rarr;
            </a>
          </div>
          <label className="disclaimer-check">
            <input type="checkbox" checked={checked} onChange={handleCheck} />
            <span>Saya telah membaca dan memahami ketentuan kunjungan kerja di atas.</span>
          </label>
          <div className="modal-actions">
            <button className="btn-primary" disabled={!checked} onClick={onClose}>Lanjutkan</button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ---- Info Menginap Modal — React.memo ----
const InfoMenginapModal = memo(function InfoMenginapModal({ open, onClose }: any) {
  const [checked, setChecked] = useState(false);
  const handleCheck = useCallback((e: any) => setChecked(e.target.checked), []);
  return (
    <div className={`modal-overlay${open ? ' active' : ''}`}>
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3>Info Rencana Menginap</h3>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-main)' }}>
            Karena Anda berencana menginap, setelah permohonan <strong>disetujui</strong>, Anda wajib mengunggah{' '}
            <strong>bukti pemesanan akomodasi</strong> (hotel/penginapan di wilayah Kabupaten Bogor).
          </p>
          <label className="disclaimer-check">
            <input type="checkbox" checked={checked} onChange={handleCheck} />
            <span>Saya mengerti dan akan menyiapkan bukti pemesanan penginapan.</span>
          </label>
          <div className="modal-actions">
            <button className="btn-primary" disabled={!checked} onClick={onClose}>Mengerti</button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ---- Konfirmasi Kirim Modal — React.memo ----
const KonfirmasiKirimModal = memo(function KonfirmasiKirimModal({ open, onYes, onNo, loading }: any) {
  if (!open) return null;
  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="konfirmasi-kirim-title">
      <div className="modal" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 id="konfirmasi-kirim-title">Konfirmasi Permohonan</h3>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-main)', margin: 0 }}>
            Apakah semua data dan dokumen yang diisi sudah benar?
          </p>
          <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
            <button className="btn-outline" onClick={onNo} disabled={loading} style={{ flex: 1 }}>Tidak</button>
            <button className="btn-primary" onClick={onYes} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Mengirim...' : 'Ya'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});



// ---- Google reCAPTCHA v2 — React.memo ----
const RecaptchaModal = memo(function RecaptchaModal({ open, onVerified, onClose, loading }: any) {
  const captchaRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const renderingRef = useRef(false);
  const onVerifiedRef = useRef(onVerified);
  const siteKey = getRecaptchaSiteKey();
  const [captchaError, setCaptchaError] = useState('');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  const initCaptcha = useCallback(() => {
    if (!open || !siteKey) return;
    let isSubscribed = true;
    setCaptchaError('');

    loadRecaptchaScript()
      .then(() => {
        if (!isSubscribed || !captchaRef.current || !window.grecaptcha) return;
        window.grecaptcha.ready(() => {
          if (!isSubscribed || !captchaRef.current || !window.grecaptcha) return;
          if (renderingRef.current || captchaRef.current.children.length > 0) {
            if (widgetIdRef.current !== null) {
              try { window.grecaptcha.reset(widgetIdRef.current); } catch { }
            }
            return;
          }
          renderingRef.current = true;
          try {
            const id = window.grecaptcha.render(captchaRef.current, {
              sitekey: siteKey,
              callback: (token: string) => { onVerifiedRef.current(token); },
              'expired-callback': () => {
                if (widgetIdRef.current !== null && window.grecaptcha) {
                  try { window.grecaptcha.reset(widgetIdRef.current); } catch { }
                }
              },
              'error-callback': () => {
                setCaptchaError('reCAPTCHA tidak dapat dimuat. Periksa koneksi internet Anda lalu coba lagi.');
              },
            });
            widgetIdRef.current = id;
          } catch {
            setCaptchaError('reCAPTCHA gagal dimuat. Pastikan site key terdaftar untuk domain ini.');
          } finally {
            renderingRef.current = false;
          }
        });
      })
      .catch((err: any) => {
        if (isSubscribed) {
          setCaptchaError(err.message || 'Skrip reCAPTCHA tidak dapat dimuat. Periksa koneksi internet Anda.');
        }
      });

    return () => { isSubscribed = false; };
  }, [open, siteKey]);

  useEffect(() => {
    const cleanup = initCaptcha();
    return () => { if (cleanup) cleanup(); };
  }, [initCaptcha]);

  useEffect(() => {
    if (!open) {
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try { window.grecaptcha.reset(widgetIdRef.current); } catch { }
      }
      widgetIdRef.current = null;
      renderingRef.current = false;
      setCaptchaError('');
    }
  }, [open]);

  const handleRetry = useCallback(() => {
    resetRecaptchaPromise();
    setRetrying(true);
    setCaptchaError('');
    initCaptcha();
    setTimeout(() => setRetrying(false), 500);
  }, [initCaptcha]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="recaptcha-title">
      <div className="modal" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 id="recaptcha-title">Verifikasi Keamanan</h3>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-sub)', marginBottom: '18px' }}>
            Silakan centang kotak <strong>"Saya bukan robot"</strong> di bawah untuk melanjutkan pengiriman:
          </p>
          {siteKey ? (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0', minHeight: '78px' }}>
              <div ref={captchaRef} />
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#B91C1C' }}>reCAPTCHA belum dikonfigurasi di .env.</p>
          )}
          {captchaError && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ fontSize: '12px', color: '#B91C1C', lineHeight: '1.5', marginBottom: '8px' }}>
                {captchaError}
              </p>
              <button
                type="button"
                className="btn-outline"
                style={{ fontSize: '12px', padding: '4px 12px' }}
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? 'Memuat...' : 'Coba Lagi'}
              </button>
            </div>
          )}
          <div className="modal-actions" style={{ marginTop: '18px' }}>
            <button className="btn-outline" onClick={handleClose} disabled={loading} style={{ width: '100%' }}>
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ---- Main Page ----
export default function Permohonan() {
  const navigate = useNavigate();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showInfoMenginap, setShowInfoMenginap] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [submittedKode, setSubmittedKode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Salin');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadRecaptchaScript().catch(() => { });
  }, []);

  const [form, setForm] = useState<any>(INITIAL_FORM);
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [errors, setErrors] = useState<any>({});
  const [busyDates, setBusyDates] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockedDetails, setBlockedDetails] = useState<Record<string, any>>({});
  const [fullDates, setFullDates] = useState<string[]>([]);
  const [approvedVisits, setApprovedVisits] = useState<Record<string, any[]>>({});
  const [minDateStr, setMinDateStr] = useState<string>('');
  const [minHari, setMinHari] = useState<number>(1);
  const [userBookedDates, setUserBookedDates] = useState<string[]>([]);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [dinasList, setDinasList] = useState<any[]>([]);
  const [isDinasOpen, setIsDinasOpen] = useState(false);

  useEffect(() => {
    api.get('/settings/public')
      .then(res => {
        if (res.data?.data?.min_hari_kunjungan) {
          setMinHari(Number(res.data.data.min_hari_kunjungan));
        }
      })
      .catch(() => { });

    api.get('/dinas')
      .then(res => {
        if (res.data.success) {
          setDinasList(res.data.data);
        }
      })
      .catch(err => console.error('Gagal mengambil daftar dinas:', err));
  }, []);

  const showToast = useCallback((msg: any, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  }, []);

  useEffect(() => {
    // Jika belum memilih dinas tujuan, kalender bersih (semua tanggal valid tampil biru/tersedia)
    if (!form.dinasId) {
      setBusyDates([]);
      setBlockedDates([]);
      setBlockedDetails({});
      setFullDates([]);
      setApprovedVisits({});
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const params: any = {
      dinas_id: form.dinasId
    };

    // Tangkap emailParam di closure — digunakan untuk memutuskan apakah perlu update userBookedDates
    const emailParam = (form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      ? form.email.trim()
      : null;

    if (emailParam) {
      params.email = emailParam;
    } else {
      // Email kosong/tidak valid — langsung reset user-booked agar tidak ada sisa data email lama
      setUserBookedDates([]);
    }

    if (form.dinasId) {
      params.dinas_id = form.dinasId;
    }

    api.get('/permohonan/tanggal-terpakai', { params, signal: controller.signal })
      .then(res => {
        const busy = res.data.data || [];
        const blocked = res.data.blocked_dates || [];
        const details = res.data.blocked_details || {};
        const full = res.data.full_dates || [];
        const approved = res.data.approved_visits || {};

        setBusyDates(busy);
        setBlockedDates(blocked);
        setBlockedDetails(details);
        setFullDates(full);
        setApprovedVisits(approved);

        // Jika tanggal yang sempat dipilih ternyata masuk tanggal terpakai/diblokir pada dinas baru, batalkan pilihan
        setSelectedDate(prev => (prev && busy.includes(prev) ? '' : prev));

        if (res.data.min_date) {
          setMinDateStr(res.data.min_date);
        }
        if (res.data.min_hari !== undefined) {
          setMinHari(Number(res.data.min_hari));
        }
        // Hanya update userBookedDates jika request dikirim dengan email valid.
        if (emailParam) {
          const booked: string[] = res.data.user_booked_dates || [];
          setUserBookedDates(booked);
          // Batalkan pilihan tanggal jika ternyata sudah pernah mencapai 2x untuk dinas ini
          setSelectedDate(prev => (prev && booked.includes(prev) ? '' : prev));
        }
      })
      .catch(err => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Gagal mengambil jadwal:', err);
        }
      });

    return () => {
      controller.abort();
    };
  }, [form.email, form.dinasId]);

  const handleDateSelect = useCallback((dateStr: any) => {
    if (!form.dinasId) {
      setErrors((prev: any) => ({ ...prev, dinasId: 'Silakan pilih dinas tujuan terlebih dahulu.' }));
      setStep(1);
      return;
    }
    if (blockedDates.includes(dateStr) || fullDates.includes(dateStr) || busyDates.includes(dateStr)) {
      return;
    }
    setSelectedDate(dateStr);
    setStep(3);
  }, [form.dinasId, blockedDates, fullDates, busyDates]);

  const handleRencanaMenginap = useCallback((val: any) => {
    setForm((f: any) => ({ ...f, rencanaMenginap: val }));
    if (val === 'Ya') setShowInfoMenginap(true);
    else setShowInfoMenginap(false);
  }, []);

  const handleCloseDisclaimer = useCallback(() => setShowDisclaimer(false), []);
  const handleCloseInfoMenginap = useCallback(() => setShowInfoMenginap(false), []);
  const handleCloseSubmitConfirm = useCallback(() => setShowSubmitConfirm(false), []);
  const handleCloseRecaptcha = useCallback(() => setShowRecaptcha(false), []);

  // Helper: hapus error satu field tertentu
  const clearError = useCallback((field: string) => {
    setErrors((prev: any) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleFile1Change = useCallback((e: any) => {
    const f = e.target.files[0];
    if (f) {
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        showToast('Surat permohonan harus berformat PDF.', 'error');
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        showToast('Ukuran file maksimal 10 MB.', 'error');
        return;
      }
      setFile1(f);
      clearError('file1');
    }
  }, [showToast, clearError]);

  const handleFile2Change = useCallback((e: any) => {
    const f = e.target.files[0];
    if (f) {
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        showToast('Daftar pertanyaan harus berformat PDF.', 'error');
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        showToast('Ukuran file maksimal 10 MB.', 'error');
        return;
      }
      setFile2(f);
      clearError('file2');
    }
  }, [showToast, clearError]);

  const validate = useCallback(() => {
    const e: any = {};
    if (!form.nomorSurat) e.nomorSurat = 'Nomor Surat Resmi wajib diisi.';
    if (!form.namaPic) e.namaPic = 'Nama Pemohon/PIC wajib diisi.';
    if (!form.instansi) e.instansi = 'Instansi/Organisasi wajib diisi.';
    if (!form.jabatanPic) e.jabatanPic = 'Jabatan/Posisi PIC wajib diisi.';
    if (!form.noTelp) e.noTelp = 'Nomor Telepon wajib diisi.';
    else if (form.noTelp.replace(/\D/g, '').length < 10) e.noTelp = 'Nomor Telepon tidak valid (min 10 digit).';
    if (!form.email) e.email = 'Email wajib diisi.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Format email tidak valid.';
    if (!form.dinasId) e.dinasId = 'Dinas/Instansi yang Dituju wajib diisi.';
    if (!form.tujuan) e.tujuan = 'Deskripsi Tujuan/Maksud Kunjungan wajib diisi.';
    if (!form.namaKetuaRombongan) e.namaKetuaRombongan = 'Nama Ketua Rombongan wajib diisi.';
    if (!form.jabatanKetuaRombongan) e.jabatanKetuaRombongan = 'Jabatan Ketua Rombongan wajib diisi.';
    if (!form.jumlahPeserta) e.jumlahPeserta = 'Jumlah Peserta wajib diisi.';
    if (!form.rencanaMenginap) e.rencanaMenginap = 'Silakan pilih apakah ada rencana menginap.';
    if (form.rencanaMenginap === 'Ya' && !form.namaHotel) e.namaHotel = 'Nama Hotel/Penginapan wajib diisi.';
    if (!file1) e.file1 = 'Surat Permohonan Kunjungan Kerja belum diupload.';
    if (!file2) e.file2 = 'Daftar Pertanyaan belum diupload.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, file1, file2]);

  const goToKonfirmasi = useCallback(() => {
    if (validate()) {
      setStep(4);
    } else {
      // Scroll ke field pertama yang error
      setTimeout(() => {
        for (const field of FIELD_ORDER) {
          const el = document.getElementById(`field-${field}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const input = el.querySelector('input, textarea, select') as HTMLElement | null;
            if (input) input.focus();
            break;
          }
        }
      }, 50);
    }
  }, [validate]);

  const handleGoToStep1 = useCallback(() => setStep(1), []);
  const handleGoToStep2 = useCallback(() => setStep(2), []);
  const handleGoToStep3 = useCallback(() => setStep(3), []);
  const handleOpenSubmitConfirm = useCallback(() => setShowSubmitConfirm(true), []);

  const copyKode = useCallback(() => {
    navigator.clipboard.writeText(submittedKode).then(() => {
      setCopyLabel('Tersalin!');
      setTimeout(() => setCopyLabel('Salin'), 2000);
    });
  }, [submittedKode]);

  const submitPermohonan = useCallback(async (recaptchaToken: string) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('tanggal_kunjungan', selectedDate);
      formData.append('nomor_surat', form.nomorSurat);
      formData.append('nama_pic', form.namaPic);
      formData.append('instansi', form.instansi);
      formData.append('jabatan_pic', form.jabatanPic);
      formData.append('no_telp', form.noTelp);
      formData.append('email', form.email);
      formData.append('tujuan', form.tujuan);
      formData.append('dinas_id', form.dinasId);
      formData.append('nama_ketua_rombongan', form.namaKetuaRombongan);
      formData.append('jabatan_ketua_rombongan', form.jabatanKetuaRombongan);
      formData.append('jumlah_peserta', form.jumlahPeserta);
      formData.append('rencana_menginap', form.rencanaMenginap);
      formData.append('recaptcha_token', recaptchaToken);
      if (form.rencanaMenginap === 'Ya') formData.append('nama_hotel', form.namaHotel);
      formData.append('surat_permohonan', file1 as Blob);
      formData.append('daftar_pertanyaan', file2 as Blob);

      const res = await api.post('/permohonan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowSubmitConfirm(false);
      setShowRecaptcha(false);
      setSubmittedKode(res.data.data.kode);
      setStep(5);
    } catch (err: any) {
      if (err.response?.status === 422) {
        const errData = err.response.data.errors || {};
        if (errData.recaptcha_token) {
          setShowRecaptcha(false);
          setShowSubmitConfirm(true);
          alert(errData.recaptcha_token[0] || 'Verifikasi reCAPTCHA gagal. Silakan coba lagi.');
          return;
        }
        const newErrors: any = {};
        if (errData.nomor_surat) newErrors.nomorSurat = true;
        if (errData.nama_pic) newErrors.namaPic = true;
        if (errData.instansi) newErrors.instansi = true;
        if (errData.jabatan_pic) newErrors.jabatanPic = true;
        if (errData.no_telp) newErrors.noTelp = true;
        if (errData.email) newErrors.email = true;
        if (errData.tujuan) newErrors.tujuan = true;
        if (errData.dinas_id) newErrors.dinasId = true;
        if (errData.nama_ketua_rombongan) newErrors.namaKetuaRombongan = true;
        if (errData.jabatan_ketua_rombongan) newErrors.jabatanKetuaRombongan = true;
        if (errData.jumlah_peserta) newErrors.jumlahPeserta = true;
        if (errData.rencana_menginap) newErrors.rencanaMenginap = true;
        if (errData.nama_hotel) newErrors.namaHotel = true;
        if (errData.surat_permohonan) newErrors.file1 = true;
        if (errData.daftar_pertanyaan) newErrors.file2 = true;
        setErrors(newErrors);
        setShowSubmitConfirm(false);
        setShowRecaptcha(false);
        alert('Mohon periksa kembali form anda. ' + err.response.data.message);
        setStep(3);
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Terjadi kesalahan sistem. Silakan coba lagi nanti.';
        setShowRecaptcha(false);
        alert(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedDate, form, file1, file2]);

  const handleYesSubmitConfirm = useCallback(() => {
    setShowSubmitConfirm(false);
    setShowRecaptcha(true);
  }, []);

  const handleGoToStatus = useCallback(() => {
    navigate('/status?kode=' + submittedKode);
  }, [navigate, submittedKode]);

  const handleResetForm = useCallback(() => {
    setStep(1);
    setSelectedDate('');
    setSubmittedKode('');
    setForm(INITIAL_FORM);
    setFile1(null);
    setFile2(null);
  }, []);

  return (
    <PublicLayout>
      <DisclaimerModal open={showDisclaimer} onClose={handleCloseDisclaimer} minHari={minHari} />
      <InfoMenginapModal open={showInfoMenginap} onClose={handleCloseInfoMenginap} />
      <KonfirmasiKirimModal open={showSubmitConfirm} onYes={handleYesSubmitConfirm} onNo={handleCloseSubmitConfirm} loading={submitting} />
      <RecaptchaModal open={showRecaptcha} onVerified={submitPermohonan} onClose={handleCloseRecaptcha} loading={submitting} />

      <div style={{ background: 'var(--gray-bg)', minHeight: 'calc(100vh - 80px)' }}>
        {/* Step 5: Sukses (Detail Kunjungan) */}
        {step === 5 ? (
          <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 20px 64px' }}>
            <div className="card">
              <div className="card-body" style={{ padding: '40px 32px' }}>
                <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                  <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#C5DBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,40,179,0.15)' }}>
                      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#0028B3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <path d="M22 4 12 14.01l-3-3" />
                      </svg>
                    </div>
                  </div>
                  <h3 style={{ color: '#001178', marginBottom: '10px', fontSize: '22px', fontWeight: '800', letterSpacing: '-0.3px' }}>Permohonan Berhasil Diajukan!</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: '1.7', marginBottom: '24px' }}>
                    Simpan kode permohonan Anda untuk memantau status. Konfirmasi telah dikirim ke email Anda.
                  </p>
                  <div className="kode-wrapper">
                    <div className="kode-box">{submittedKode}</div>
                    <button className="btn-copy-kode" onClick={copyKode}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {copyLabel}
                    </button>
                  </div>
                </div>
                <div className="modal-actions" style={{ gap: '12px' }}>
                  <button className="btn-primary" onClick={handleGoToStatus}>
                    Status Permohonan                  </button>
                  <button className="btn-outline" onClick={handleResetForm}>
                    Ajukan Permohonan Lain
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="layout-grid">
            {/* Kalender — terisolasi via React.memo, tidak ikut render saat form berubah */}
            {/* key berubah saat userBookedDates berubah isinya → memaksa remount Calendar */}
            <div id="calendarColumn">
              <Calendar
                key={userBookedDates.join(',') + '_' + blockedDates.join(',') + '_' + fullDates.join(',') + '_' + Object.keys(approvedVisits).join(',')}
                busyDates={busyDates}
                blockedDates={blockedDates}
                blockedDetails={blockedDetails}
                fullDates={fullDates}
                approvedVisits={approvedVisits}
                selectedDate={selectedDate}
                onSelect={handleDateSelect}
                minDateStr={minDateStr}
                userBookedDates={userBookedDates}
              />
            </div>

            {/* Form */}
            <div>
              <div className="card" style={{ overflow: 'visible' }}>
                <div className="card-header form-card-header" id="formCardHeader" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {step > 2 && (
                    <button
                      type="button"
                      onClick={step === 4 ? handleGoToStep3 : handleGoToStep2}
                      title={step === 4 ? 'Kembali ke Data Pemohon' : 'Kembali ke Pilih Dinas & Tanggal'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#0028B3',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        flexShrink: 0,
                        padding: 0,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#0028B3';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#0028B3';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#EFF6FF';
                        e.currentTarget.style.color = '#0028B3';
                        e.currentTarget.style.borderColor = '#BFDBFE';
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </button>
                  )}
                  <h3 style={{ margin: 0 }}>Form Pengajuan Kunjungan Kerja</h3>
                </div>
                <div className="card-body" style={{ overflow: 'visible' }}>
                  <StepIndicator step={step} />

                  {/* Step 1 & 2: Pilih Dinas & Pilih Tanggal */}
                  {(step === 1 || step === 2) && (
                    <div
                      style={{
                        padding: '36px 24px',
                        paddingBottom: isDinasOpen ? '270px' : '56px',
                        color: 'var(--text-sub)',
                        minHeight: '460px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        transition: 'padding-bottom 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                          <div
                            style={{
                              width: '68px',
                              height: '68px',
                              borderRadius: '20px',
                              background: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 6px 20px rgba(0, 40, 179, 0.12)',
                              border: '1px solid rgba(0, 40, 179, 0.08)',
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#0028B3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85M19 21V10.85M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
                            </svg>
                          </div>
                        </div>
                        <h3 style={{ color: '#001178', marginBottom: '8px', fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px' }}>
                          Pilih Dinas Tujuan
                        </h3>
                        <p style={{ fontSize: '13.5px', lineHeight: '1.65', maxWidth: '460px', margin: '0 auto' }}>
                          Silakan pilih dinas/instansi pemerintah yang ingin Anda kunjungi. Jadwal ketersediaan tanggal akan otomatis disesuaikan dengan dinas pilihan Anda.
                        </p>
                      </div>

                      <div className="form-group" style={{ textAlign: 'left', maxWidth: '460px', width: '100%', margin: '0 auto' }}>
                        <label style={{ fontWeight: '700', color: '#001178', marginBottom: '8px', display: 'block', fontSize: '13.5px' }}>
                          Dinas/Instansi yang Dituju <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <SearchableDinasSelect
                          dinasList={dinasList}
                          value={form.dinasId}
                          error={!!errors.dinasId}
                          onOpenChange={setIsDinasOpen}
                          onChange={(selectedId, selectedDinas) => {
                            setForm((f: any) => ({
                              ...f,
                              dinasId: selectedId,
                              dinasTujuan: selectedDinas ? selectedDinas.nama : ''
                            }));
                            if (selectedId) {
                              clearError('dinasId');
                              setStep(2);
                            } else {
                              setStep(1);
                            }
                          }}
                        />
                        {errors.dinasId && <p style={ERR_MSG_STYLE}>⚠ {errors.dinasId}</p>}

                        {/* Status guidance card */}
                        {form.dinasId ? (
                          <div
                            style={{
                              marginTop: '16px',
                              padding: '16px 18px',
                              borderRadius: '12px',
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              boxShadow: '0 2px 8px rgba(0, 40, 179, 0.06)',
                              animation: 'fadeIn 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0028B3', fontWeight: '700', fontSize: '13.5px' }}>
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                              <span>Dinas Terpilih: {dinasList.find(d => d.id.toString() === form.dinasId)?.nama || form.dinasTujuan}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#1E40AF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                              <span>No. Telp: <strong>{dinasList.find(d => d.id.toString() === form.dinasId)?.nomor_telepon || '-'}</strong></span>
                            </div>
                            <div
                              style={{
                                marginTop: '4px',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                background: '#DBEAFE',
                                border: '1px solid #93C5FD',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: '#1E3A8A',
                                fontSize: '12.5px',
                                fontWeight: '600',
                                lineHeight: '1.45',
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                              </svg>
                              <span>Silakan langsung pilih tanggal kunjungan yang <strong style={{ color: '#0028B3' }}>tersedia (warna biru)</strong> pada kalender di sebelah kiri.</span>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              marginTop: '14px',
                              padding: '11px 14px',
                              borderRadius: '10px',
                              background: '#F8FAFC',
                              border: '1px dashed #CBD5E1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              color: '#64748B',
                              fontSize: '12px',
                              lineHeight: '1.5',
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span>Pilih salah satu instansi dinas di atas untuk melihat jadwal kalender di sebelah kiri.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3 */}
                  {step === 3 && (
                    <div>
                      <div className="selected-date-display" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                          <span>Tanggal terpilih: <strong>{formatDisplayDate(selectedDate)}</strong></span>
                        </div>
                        {form.dinasTujuan && (
                          <div style={{ fontSize: '12.5px', color: '#0028B3', fontWeight: '600' }}>
                            Tujuan: <strong>{form.dinasTujuan}</strong>
                          </div>
                        )}
                      </div>

                      {/* Banner Info: Tamu yang Sudah di-ACC pada Tanggal Terpilih */}
                      {selectedDate && approvedVisits[selectedDate] && approvedVisits[selectedDate].length > 0 && (
                        <div
                          style={{
                            marginTop: '12px',
                            marginBottom: '16px',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            borderLeft: '4px solid #0284C7',
                            animation: 'fadeIn 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', color: '#0369A1', fontSize: '13px', fontWeight: '700' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>Tamu Terjadwal di Tanggal Ini ({approvedVisits[selectedDate].length}/2 Kuota Terisi):</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {approvedVisits[selectedDate].map((t: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  background: '#FFFFFF',
                                  border: '1px solid #E0F2FE',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '6px',
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: '800', color: '#0C4A6E', fontSize: '12.5px' }}>
                                    {t.instansi}
                                  </div>
                                  <div style={{ color: '#475569', fontSize: '11.5px', marginTop: '1px' }}>
                                    Ketua: <strong>{t.nama_tamu}</strong>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {t.jumlah_peserta > 0 && (
                                    <span style={{ fontSize: '11px', background: '#F1F5F9', color: '#334155', padding: '2px 7px', borderRadius: '5px', fontWeight: '600' }}>
                                      {t.jumlah_peserta} Orang
                                    </span>
                                  )}
                                  {t.jam_penerimaan && (
                                    <span style={{ fontSize: '11px', background: '#E0F2FE', color: '#0284C7', padding: '2px 7px', borderRadius: '5px', fontWeight: '700' }}>
                                      {t.jam_penerimaan}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="form-title">Data Pemohon</div>
                      <div className="form-grid">
                        <div className="form-group" id="field-nomorSurat">
                          <label>Nomor Surat Resmi *</label>
                          <input type="text" className={errors.nomorSurat ? 'error' : ''} value={form.nomorSurat} onChange={e => { setForm((f: any) => ({ ...f, nomorSurat: e.target.value })); if (e.target.value) clearError('nomorSurat'); }} placeholder="001/ORG/XII/2024" />
                          {errors.nomorSurat && <p style={ERR_MSG_STYLE}>⚠ {errors.nomorSurat}</p>}
                        </div>
                        <div className="form-group" id="field-namaPic">
                          <label>Nama Pemohon/PIC (Penanggung Jawab) *</label>
                          <input type="text" className={errors.namaPic ? 'error' : ''} value={form.namaPic} onChange={e => { setForm((f: any) => ({ ...f, namaPic: e.target.value })); if (e.target.value) clearError('namaPic'); }} placeholder="Nama Pemohon" />
                          {errors.namaPic && <p style={ERR_MSG_STYLE}>⚠ {errors.namaPic}</p>}
                        </div>
                        <div className="form-group" id="field-instansi">
                          <label>Instansi/Organisasi *</label>
                          <input type="text" className={errors.instansi ? 'error' : ''} value={form.instansi} onChange={e => { setForm((f: any) => ({ ...f, instansi: e.target.value })); if (e.target.value) clearError('instansi'); }} placeholder="Nama instansi" />
                          {errors.instansi && <p style={ERR_MSG_STYLE}>⚠ {errors.instansi}</p>}
                        </div>
                        <div className="form-group" id="field-jabatanPic">
                          <label>Jabatan/Posisi PIC (Penanggung Jawab) *</label>
                          <input type="text" className={errors.jabatanPic ? 'error' : ''} value={form.jabatanPic} onChange={e => { setForm((f: any) => ({ ...f, jabatanPic: e.target.value })); if (e.target.value) clearError('jabatanPic'); }} placeholder="Jabatan Anda" />
                          {errors.jabatanPic && <p style={ERR_MSG_STYLE}>⚠ {errors.jabatanPic}</p>}
                        </div>
                        <div className="form-group" id="field-noTelp">
                          <label>Nomor Telepon *</label>
                          <input type="text" inputMode="numeric" className={errors.noTelp ? 'error' : ''} value={form.noTelp} onChange={e => { setForm((f: any) => ({ ...f, noTelp: e.target.value })); if (e.target.value && e.target.value.replace(/\D/g, '').length >= 10) clearError('noTelp'); }} placeholder="08xxxxxxxxxx" />
                          {errors.noTelp && <p style={ERR_MSG_STYLE}>⚠ {errors.noTelp}</p>}
                        </div>
                        <div className="form-group" id="field-email">
                          <label>Email *</label>
                          <input type="email" className={errors.email ? 'error' : ''} value={form.email} onChange={e => { setForm((f: any) => ({ ...f, email: e.target.value })); if (e.target.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) clearError('email'); }} placeholder="email@domain.com" />
                          {errors.email && <p style={ERR_MSG_STYLE}>⚠ {errors.email}</p>}
                        </div>
                      </div>

                      <div className="form-title">Detail Kunjungan</div>
                      <div className="form-grid full">
                        <div className="form-group" id="field-tujuan">
                          <label>Deskripsi Tujuan/Maksud Kunjungan *</label>
                          <textarea className={errors.tujuan ? 'error' : ''} value={form.tujuan} onChange={e => { setForm((f: any) => ({ ...f, input: e.target.value, tujuan: e.target.value })); if (e.target.value) clearError('tujuan'); }} placeholder="Jelaskan tujuan kunjungan secara singkat dan jelas" />
                          {errors.tujuan && <p style={ERR_MSG_STYLE}>⚠ {errors.tujuan}</p>}
                        </div>
                      </div>
                      <div className="form-grid" style={{ marginTop: '18px' }}>
                        <div className="form-group" id="field-namaKetuaRombongan">
                          <label>Nama Ketua Rombongan *</label>
                          <input type="text" className={errors.namaKetuaRombongan ? 'error' : ''} value={form.namaKetuaRombongan} onChange={e => { setForm((f: any) => ({ ...f, namaKetuaRombongan: e.target.value })); if (e.target.value) clearError('namaKetuaRombongan'); }} placeholder="Nama Ketua Rombongan" />
                          {errors.namaKetuaRombongan && <p style={ERR_MSG_STYLE}>⚠ {errors.namaKetuaRombongan}</p>}
                        </div>
                        <div className="form-group" id="field-jabatanKetuaRombongan">
                          <label>Jabatan Ketua Rombongan *</label>
                          <input type="text" className={errors.jabatanKetuaRombongan ? 'error' : ''} value={form.jabatanKetuaRombongan} onChange={e => { setForm((f: any) => ({ ...f, jabatanKetuaRombongan: e.target.value })); if (e.target.value) clearError('jabatanKetuaRombongan'); }} placeholder="Jabatan Ketua Rombongan" />
                          {errors.jabatanKetuaRombongan && <p style={ERR_MSG_STYLE}>⚠ {errors.jabatanKetuaRombongan}</p>}
                        </div>
                      </div>
                      <div className="form-grid" style={{ marginTop: '16px' }}>
                        <div className="form-group" id="field-jumlahPeserta">
                          <label>Jumlah Peserta *</label>
                          <input type="number" min="1" className={errors.jumlahPeserta ? 'error' : ''} value={form.jumlahPeserta} onChange={e => { setForm((f: any) => ({ ...f, jumlahPeserta: e.target.value })); if (e.target.value) clearError('jumlahPeserta'); }} placeholder="Jumlah peserta" />
                          {errors.jumlahPeserta && <p style={ERR_MSG_STYLE}>⚠ {errors.jumlahPeserta}</p>}
                        </div>
                      </div>

                      <div className="form-title" style={{ marginTop: '28px' }}>Rencana Menginap</div>
                      <div className="form-grid full">
                        <div className="form-group" id="field-rencanaMenginap">
                          <label>Apakah ada rencana menginap? *</label>
                          <CustomDropdown value={form.rencanaMenginap} onChange={(val: any) => { handleRencanaMenginap(val); if (val) clearError('rencanaMenginap'); }} error={!!errors.rencanaMenginap} />
                          {errors.rencanaMenginap && <p style={ERR_MSG_STYLE}>⚠ {errors.rencanaMenginap}</p>}
                        </div>
                      </div>
                      {form.rencanaMenginap === 'Ya' && (
                        <div className="form-grid full" style={{ marginTop: '16px' }}>
                          <div className="form-group" id="field-namaHotel">
                            <label>Nama Hotel/Penginapan *</label>
                            <input type="text" className={errors.namaHotel ? 'error' : ''} value={form.namaHotel} onChange={e => { setForm((f: any) => ({ ...f, namaHotel: e.target.value })); if (e.target.value) clearError('namaHotel'); }} placeholder="Nama hotel atau penginapan" />
                            {errors.namaHotel && <p style={ERR_MSG_STYLE}>⚠ {errors.namaHotel}</p>}
                          </div>
                        </div>
                      )}

                      <div className="form-title" style={{ marginTop: '28px' }}>Surat Pendukung</div>
                      <div className="upload-pair">
                        <div id="field-file1">
                          <span className="upload-item-label">Surat Permohonan Kunjungan Kerja <span style={{ color: '#e74c3c' }}>*</span></span>
                          <UploadArea file={file1} error={!!errors.file1} id="fileSurat1" onChange={handleFile1Change} />
                          {errors.file1 && <p style={ERR_MSG_STYLE}>⚠ {errors.file1}</p>}
                        </div>
                        <div id="field-file2">
                          <span className="upload-item-label">Daftar Pertanyaan <span style={{ color: '#e74c3c' }}>*</span></span>
                          <UploadArea file={file2} error={!!errors.file2} id="fileSurat2" onChange={handleFile2Change} />
                          {errors.file2 && <p style={ERR_MSG_STYLE}>⚠ {errors.file2}</p>}
                        </div>
                      </div>

                      <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
                        <button className="btn-outline" onClick={handleGoToStep2} style={{ width: 'auto', paddingLeft: '22px', paddingRight: '22px' }}>
                          Kembali
                        </button>
                        <button className="btn-primary" onClick={goToKonfirmasi} style={{ flex: 1 }}>
                          Lanjut ke Konfirmasi
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Konfirmasi */}
                  {step === 4 && (
                    <div>
                      <div className="confirm-block">
                        <div className="confirm-block-title">Tanggal &amp; Identitas</div>
                        <table className="confirm-table">
                          <tbody>
                            <tr><td>Tanggal Kunjungan</td><td>{formatDisplayDate(selectedDate)}</td></tr>
                            <tr><td>Nomor Surat</td><td>{form.nomorSurat}</td></tr>
                            <tr><td>Nama PIC</td><td>{form.namaPic}</td></tr>
                            <tr><td>Instansi</td><td>{form.instansi}</td></tr>
                            <tr><td>Jabatan PIC</td><td>{form.jabatanPic}</td></tr>
                            <tr><td>No. Telepon</td><td>{form.noTelp}</td></tr>
                            <tr><td>Email</td><td>{form.email}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="confirm-block">
                        <div className="confirm-block-title">Detail Kunjungan</div>
                        <table className="confirm-table">
                          <tbody>
                            <tr><td>Dinas Tujuan</td><td>{form.dinasTujuan}</td></tr>
                            <tr><td>Deskripsi Tujuan</td><td>{form.tujuan}</td></tr>
                            <tr><td>Ketua Rombongan</td><td>{form.namaKetuaRombongan} ({form.jabatanKetuaRombongan})</td></tr>
                            <tr><td>Jumlah Peserta</td><td>{form.jumlahPeserta} orang</td></tr>
                            <tr><td>Rencana Menginap</td><td>{form.rencanaMenginap}</td></tr>
                            {form.rencanaMenginap === 'Ya' && <tr><td>Hotel/Penginapan</td><td>{form.namaHotel}</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      <div className="confirm-block">
                        <div className="confirm-block-title">Dokumen</div>
                        <table className="confirm-table">
                          <tbody>
                            <tr><td>Surat Permohonan</td><td style={{ color: '#0028B3', fontWeight: '600' }}>{file1?.name}</td></tr>
                            <tr><td>Daftar Pertanyaan</td><td style={{ color: '#0028B3', fontWeight: '600' }}>{file2?.name}</td></tr>
                          </tbody>
                        </table>
                      </div>

                      <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
                        <button className="btn-outline" onClick={handleGoToStep3} style={{ width: 'auto', paddingLeft: '22px', paddingRight: '22px' }}>
                          Kembali
                        </button>
                        <button
                          className="btn-primary"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          disabled={submitting}
                          onClick={handleOpenSubmitConfirm}
                        >
                          {submitting && <span className="spinner" />}
                          {submitting ? 'Mengirim...' : 'Kirim Permohonan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {toast.show && (
          <div style={{ position: 'fixed', bottom: '28px', right: '28px', padding: '14px 22px', borderRadius: '12px', color: 'white', fontSize: '13.5px', fontWeight: '600', zIndex: 9999, maxWidth: '340px', boxShadow: '0 8px 24px rgba(0,17,120,0.22)', background: toast.type === 'error' ? '#B91C1C' : '#001178' }}>
            {toast.msg}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
