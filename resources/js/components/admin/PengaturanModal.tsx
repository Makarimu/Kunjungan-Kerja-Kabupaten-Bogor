import React, { useState, useEffect } from 'react';
import { getAdminSettings, updateAdminSettings, HeaderSettings } from '../../api/settings';

interface PengaturanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PengaturanModal({ isOpen, onClose }: PengaturanModalProps) {
  const [formData, setFormData] = useState<HeaderSettings>({
    header_telepon: 'Telp: (021) 875-8605',
    header_jam_layanan: 'Jam Layanan: Senin – Jumat (08.00 – 16.00 WIB)',
    header_link_portal_bogor: 'https://bogorkab.go.id',
    header_link_portal_ekabo: 'https://ekabo.bogorkab.go.id',
    min_hari_kunjungan: 1,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getAdminSettings();
      if (res?.data) {
        setFormData({
          header_telepon: res.data.header_telepon || '',
          header_jam_layanan: res.data.header_jam_layanan || '',
          header_link_portal_bogor: res.data.header_link_portal_bogor || '',
          header_link_portal_ekabo: res.data.header_link_portal_ekabo || '',
          min_hari_kunjungan: res.data.min_hari_kunjungan !== undefined ? Number(res.data.min_hari_kunjungan) : 1,
        });
      }
    } catch {
      // ignore fetch error on unopened state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
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

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateAdminSettings(formData);
      showToast(res?.message || 'Pengaturan berhasil diperbarui!');
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Gagal memperbarui pengaturan. Pastikan database MySQL aktif & migrasi telah dijalankan.';
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
          maxWidth: '780px',
          width: '100%',
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
            padding: '14px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#C5DBFF',
                color: '#001178',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#001178' }}>
                Pengaturan Sistem &amp; Publik
              </h3>
              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                Kelola aturan batas pengajuan kunjungan kerja &amp; header web
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
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px' }}>
          {/* Toast Notification */}
          {toast && (
            <div
              style={{
                marginBottom: '12px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: toast.type === 'success' ? '#DEF7EC' : '#FDE8E8',
                border: `1px solid ${toast.type === 'success' ? '#31C48D' : '#F8B4B4'}`,
                color: toast.type === 'success' ? '#03543F' : '#9B1C1C',
                fontWeight: 600,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{toast.msg}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <div style={{ width: '28px', height: '28px', border: '3px solid #C5DBFF', borderTopColor: '#0028B3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
              <div style={{ fontSize: '13px', color: '#64748B' }}>Memuat data pengaturan...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Bagian 1: Aturan Batas Minimal Hari Pengajuan Kunjungan (H- / H+) */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1.5px solid #0028B3',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: '0 2px 6px rgba(0, 40, 179, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        background: '#0028B3',
                        color: '#FFFFFF',
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0, 40, 179, 0.25)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#001178', lineHeight: 1.2 }}>
                        Aturan Batas Minimal Pengajuan Kunjungan (H- / H+)
                      </h4>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        Batas tanggal terdekat yang dapat dipilih pemohon di kalender
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      background: '#DBEAFE',
                      color: '#1E40AF',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Super Admin Only
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor="min_hari_input" style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                      Minimal Pengajuan:
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        id="min_hari_input"
                        type="number"
                        name="min_hari_kunjungan"
                        min="1"
                        max="60"
                        value={formData.min_hari_kunjungan || 1}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setFormData((prev) => ({ ...prev, min_hari_kunjungan: val }));
                        }}
                        style={{
                          width: '60px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '2px solid #0028B3',
                          fontSize: '14px',
                          fontWeight: 800,
                          color: '#001178',
                          textAlign: 'center',
                          background: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0028B3' }}>
                        Hari (H-{formData.min_hari_kunjungan || 1} / H+{formData.min_hari_kunjungan || 1})
                      </span>
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Pilihan Cepat:</span>
                    {[1, 2, 3, 5, 7, 14].map((days) => {
                      const isSelected = Number(formData.min_hari_kunjungan) === days;
                      return (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, min_hari_kunjungan: days }))}
                          style={{
                            background: isSelected ? '#001178' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#0028B3',
                            border: `1.5px solid ${isSelected ? '#001178' : '#CBD5E1'}`,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          H-{days}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bagian 2: Header Publik & Kontak */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                {/* Telepon Header */}
                <div>
                  <label htmlFor="modal_header_telepon" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Nomor Telepon Header Publik
                  </label>
                  <input
                    id="modal_header_telepon"
                    type="text"
                    name="header_telepon"
                    value={formData.header_telepon}
                    onChange={handleChange}
                    placeholder="Contoh: Telp: (021) 875-8605"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '7px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Jam Layanan Header */}
                <div>
                  <label htmlFor="modal_header_jam_layanan" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Jam Layanan Header Publik
                  </label>
                  <input
                    id="modal_header_jam_layanan"
                    type="text"
                    name="header_jam_layanan"
                    value={formData.header_jam_layanan}
                    onChange={handleChange}
                    placeholder="Contoh: Jam Layanan: Senin – Jumat (08.00 – 16.00 WIB)"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '7px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Live Preview Bar */}
              <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '8px 12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px' }}>
                  Pratinjau Topbar Publik (Live Preview):
                </div>
                <div className="gov-topbar" style={{ borderRadius: '6px', overflow: 'hidden', pointerEvents: 'none' }}>
                  <div className="gov-topbar-inner" style={{ padding: '6px 12px' }}>
                    <div className="gov-topbar-left" style={{ gap: '12px' }}>
                      <div className="gov-topbar-item" style={{ fontSize: '11px' }}>
                        <span>{formData.header_telepon || 'Telp: (021) 875-8605'}</span>
                      </div>
                      <div className="gov-topbar-divider" />
                      <div className="gov-topbar-item" style={{ fontSize: '11px' }}>
                        <span>{formData.header_jam_layanan || 'Jam Layanan: Senin – Jumat (08.00 – 16.00 WIB)'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: '7px',
                    padding: '8px 16px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: '#0028B3',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '8px 18px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(0,40,179,0.2)',
                  }}
                >
                  {saving ? (
                    <>
                      <div style={{ width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
