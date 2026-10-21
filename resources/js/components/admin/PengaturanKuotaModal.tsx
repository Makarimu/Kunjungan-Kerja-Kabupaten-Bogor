import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { getDinasKuotaList, updateDinasKuotaBulk, DinasKuotaItem } from '../../api/admin/kuota';

interface PengaturanKuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PengaturanKuotaModal({ isOpen, onClose, onSuccess }: PengaturanKuotaModalProps) {
  const [dinasList, setDinasList] = useState<DinasKuotaItem[]>([]);
  const [initialList, setInitialList] = useState<DinasKuotaItem[]>([]);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [globalValue, setGlobalValue] = useState<number>(2);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDinasKuota = async () => {
    setLoading(true);
    try {
      const res = await getDinasKuotaList();
      if (res?.data) {
        setDinasList(res.data);
        setInitialList(res.data);
      }
    } catch (err: any) {
      showToast('Gagal memuat data kuota dinas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDinasKuota();
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  // Hitung berapa dinas yang nilainya berubah dari database
  const changedCount = useMemo(() => {
    const initialMap = new Map(initialList.map((d) => [d.id, d.kuota_per_hari]));
    return dinasList.filter((d) => initialMap.get(d.id) !== d.kuota_per_hari).length;
  }, [dinasList, initialList]);

  // Filter pencarian
  const filteredDinas = useMemo(() => {
    if (!search.trim()) return dinasList;
    const q = search.toLowerCase();
    return dinasList.filter(
      (d) =>
        d.nama.toLowerCase().includes(q) ||
        (d.singkatan && d.singkatan.toLowerCase().includes(q))
    );
  }, [dinasList, search]);

  if (!isOpen) return null;

  const handleUpdateSingle = (id: number, val: number) => {
    const clamped = Math.max(1, Math.min(50, val));
    setDinasList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, kuota_per_hari: clamped } : d))
    );
  };

  const handleApplyGlobal = (kuotaVal: number) => {
    const clamped = Math.max(1, Math.min(50, kuotaVal));
    setDinasList((prev) =>
      prev.map((d) => ({ ...d, kuota_per_hari: clamped }))
    );
    showToast(`Kuota semua dinas diatur ke ${clamped} rombongan/hari (klik Simpan untuk menerapkan)`);
  };

  const handleReset = () => {
    setDinasList(initialList);
    showToast('Nilai kuota dikembalikan ke pengaturan awal');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payloadItems = dinasList.map((d) => ({
        id: d.id,
        kuota_per_hari: d.kuota_per_hari,
      }));

      const res = await updateDinasKuotaBulk({ items: payloadItems });
      if (res?.data) {
        setDinasList(res.data);
        setInitialList(res.data);
      }
      showToast(res?.message || 'Kuota dinas berhasil disimpan!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || 'Gagal menyimpan perubahan kuota dinas.';
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '860px',
          width: '100%',
          maxHeight: '92vh',
          boxShadow: '0 25px 50px -12px rgba(0, 17, 120, 0.25)',
          border: '1px solid #E2E8F0',
          position: 'relative',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                background: '#C5DBFF',
                color: '#001178',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#001178' }}>
                  Pengaturan Kuota Kunjungan
                </h3>
                <span
                  style={{
                    background: '#C5DBFF',
                    color: '#001178',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '20px',
                  }}
                >
                  Super Admin
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Atur kapasitas maksimal rombongan per hari untuk masing-masing perangkat daerah/dinas
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: saving ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Sub-Header / Global Actions */}
        <div
          style={{
            padding: '14px 22px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Toast Notification */}
          {toast && (
            <div
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                background: toast.type === 'success' ? '#DEF7EC' : '#FDE8E8',
                border: `1px solid ${toast.type === 'success' ? '#31C48D' : '#F8B4B4'}`,
                color: toast.type === 'success' ? '#03543F' : '#9B1C1C',
                fontWeight: 600,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
              <span>{toast.msg}</span>
            </div>
          )}

          {/* Quick Preset / Terapkan Serentak */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap',
              background: '#FFFFFF',
              border: '1px solid #C5DBFF',
              borderRadius: '10px',
              padding: '10px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#001178' }}>
                Terapkan Cepat ke Semua Dinas:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setGlobalValue(num);
                      handleApplyGlobal(num);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #C5DBFF',
                      background: globalValue === num ? '#001178' : '#F0F5FF',
                      color: globalValue === num ? '#FFFFFF' : '#001178',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    title={`Set semua dinas menjadi ${num} rombongan/hari`}
                  >
                    {num} Kuota
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '11.5px', color: '#64748B' }}>
              Default: <strong>2 rombongan / hari</strong>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="#64748B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Cari dinas atau akronim (contoh: Bappenda, Disdik, RSUD, Kecamatan)..."
              value={search}
              onChange={(e) => startTransition(() => setSearch(e.target.value))}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                background: '#FFFFFF',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Modal Body / Dinas List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 22px',
            background: '#FFFFFF',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  border: '3px solid #CBD5E1',
                  borderTopColor: '#0028B3',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 12px',
                }}
              />
              <span style={{ fontSize: '13px' }}>Memuat daftar kedinasan...</span>
            </div>
          ) : filteredDinas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                Tidak ada dinas yang cocok dengan "{search}"
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                Coba gunakan kata kunci pencarian yang lain
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 4px 6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                <span>Nama Perangkat Daerah ({filteredDinas.length})</span>
                <span>Batas Kuota / Hari</span>
              </div>

              {filteredDinas.map((dinas) => {
                const initialKuota = initialList.find((i) => i.id === dinas.id)?.kuota_per_hari;
                const isChanged = initialKuota !== undefined && initialKuota !== dinas.kuota_per_hari;

                return (
                  <div
                    key={dinas.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: isChanged ? '1.5px solid #0028B3' : '1px solid #E2E8F0',
                      background: isChanged ? '#F0F5FF' : '#FFFFFF',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Info Dinas */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                          {dinas.nama}
                        </span>
                        {dinas.singkatan && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              background: '#F1F5F9',
                              color: '#334155',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                            }}
                          >
                            {dinas.singkatan}
                          </span>
                        )}
                        {isChanged && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              background: '#DBEAFE',
                              color: '#1D4ED8',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            Diubah
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Kuota Stepper Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {/* Tombol Kurang */}
                      <button
                        type="button"
                        onClick={() => handleUpdateSingle(dinas.id, (dinas.kuota_per_hari || 2) - 1)}
                        disabled={saving || (dinas.kuota_per_hari || 2) <= 1}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '7px',
                          border: '1px solid #CBD5E1',
                          background: (dinas.kuota_per_hari || 2) <= 1 ? '#F1F5F9' : '#FFFFFF',
                          color: (dinas.kuota_per_hari || 2) <= 1 ? '#94A3B8' : '#0F172A',
                          cursor: (dinas.kuota_per_hari || 2) <= 1 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 700,
                          transition: 'all 0.12s',
                        }}
                        title="Kurangi kuota"
                      >
                        –
                      </button>

                      {/* Input Angka */}
                      <div style={{ position: 'relative', width: '60px' }}>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={dinas.kuota_per_hari ?? 2}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            handleUpdateSingle(dinas.id, isNaN(val) ? 1 : val);
                          }}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '6px 4px',
                            textAlign: 'center',
                            borderRadius: '7px',
                            border: '1.5px solid #0028B3',
                            fontSize: '13.5px',
                            fontWeight: 800,
                            color: '#001178',
                            fontFamily: 'inherit',
                            outline: 'none',
                            background: '#FFFFFF',
                          }}
                        />
                      </div>

                      {/* Tombol Tambah */}
                      <button
                        type="button"
                        onClick={() => handleUpdateSingle(dinas.id, (dinas.kuota_per_hari || 2) + 1)}
                        disabled={saving || (dinas.kuota_per_hari || 2) >= 50}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '7px',
                          border: '1px solid #CBD5E1',
                          background: (dinas.kuota_per_hari || 2) >= 50 ? '#F1F5F9' : '#FFFFFF',
                          color: (dinas.kuota_per_hari || 2) >= 50 ? '#94A3B8' : '#0F172A',
                          cursor: (dinas.kuota_per_hari || 2) >= 50 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 700,
                          transition: 'all 0.12s',
                        }}
                        title="Tambah kuota"
                      >
                        +
                      </button>

                      <span style={{ fontSize: '11px', color: '#64748B', minWidth: '80px' }}>
                        rombongan/hari
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {changedCount > 0 && (
              <span style={{ fontSize: '12.5px', color: '#001178', fontWeight: 600 }}>
                {changedCount} dinas telah disesuaikan
              </span>
            )}
            {changedCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '2px 4px',
                }}
              >
                Reset Perubahan
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                background: '#FFFFFF',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              style={{
                background: saving ? '#60A5FA' : '#0028B3',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 22px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0, 40, 179, 0.25)',
              }}
            >
              {saving ? (
                <>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
