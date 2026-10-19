import { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { getAdminSettings, updateAdminSettings, HeaderSettings } from '../../api/settings';

export default function Pengaturan() {
  const [formData, setFormData] = useState<HeaderSettings>({
    header_telepon: 'Telp: (021) 875-8605',
    header_jam_layanan: 'Jam Layanan: Senin – Jumat (08.00 – 16.00 WIB)',
    header_link_portal_bogor: 'https://bogorkab.go.id',
    header_link_portal_ekabo: 'https://ekabo.bogorkab.go.id',
  });
  const [loading, setLoading] = useState(true);
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
        });
      }
    } catch {
      showToast('Gagal memuat data pengaturan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
    <AdminLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header Title */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#001178', margin: '0 0 6px 0' }}>
            Pengaturan Informasi Publik
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>
            Atur informasi kontak, jam layanan, dan link portal yang ditampilkan pada bagian teratas (*header topbar*) halaman publik.
          </p>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            style={{
              marginBottom: '20px',
              padding: '14px 18px',
              borderRadius: '10px',
              background: toast.type === 'success' ? '#DEF7EC' : '#FDE8E8',
              border: `1px solid ${toast.type === 'success' ? '#31C48D' : '#F8B4B4'}`,
              color: toast.type === 'success' ? '#03543F' : '#9B1C1C',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
          <div style={{ background: '#fff', borderRadius: '14px', padding: '40px', textAlign: 'center', border: '1px solid #E4E7ED' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #C5DBFF', borderTopColor: '#0028B3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '14px', color: '#64748B' }}>Memuat pengaturan...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Form Card */}
            <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E4E7ED', padding: '24px', boxShadow: '0 2px 12px rgba(0,17,120,0.03)' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '18px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                Formulir Pengaturan Header Topbar
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Telepon Header */}
                <div>
                  <label htmlFor="header_telepon" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                    Nomor Telepon Header Publik
                  </label>
                  <input
                    id="header_telepon"
                    type="text"
                    name="header_telepon"
                    value={formData.header_telepon}
                    onChange={handleChange}
                    placeholder="Contoh: Telp: (021) 875-8605"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border 0.2s',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                    Informasi nomor kontak yang akan muncul di sebelah kiri topbar publik.
                  </div>
                </div>

                {/* Jam Layanan Header */}
                <div>
                  <label htmlFor="header_jam_layanan" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                    Jam Layanan Header Publik
                  </label>
                  <input
                    id="header_jam_layanan"
                    type="text"
                    name="header_jam_layanan"
                    value={formData.header_jam_layanan}
                    onChange={handleChange}
                    placeholder="Contoh: Jam Layanan: Senin – Jumat (08.00 – 16.00 WIB)"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border 0.2s',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                    Informasi jam operasional layanan publik.
                  </div>
                </div>

                {/* Link Portal Kab Bogor */}
                <div>
                  <label htmlFor="header_link_portal_bogor" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                    Tautan Portal Kab. Bogor
                  </label>
                  <input
                    id="header_link_portal_bogor"
                    type="url"
                    name="header_link_portal_bogor"
                    value={formData.header_link_portal_bogor || ''}
                    onChange={handleChange}
                    placeholder="https://bogorkab.go.id"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                    URL tujuan ketika pengguna menekan tombol "Portal Kab. Bogor".
                  </div>
                </div>

                {/* Link Portal EKABO */}
                <div>
                  <label htmlFor="header_link_portal_ekabo" style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                    Tautan Portal EKABO
                  </label>
                  <input
                    id="header_link_portal_ekabo"
                    type="url"
                    name="header_link_portal_ekabo"
                    value={formData.header_link_portal_ekabo || ''}
                    onChange={handleChange}
                    placeholder="https://ekabo.bogorkab.go.id"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                    URL tujuan ketika pengguna menekan tombol "Portal EKABO".
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: '#0028B3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,40,179,0.25)',
                    transition: 'all 0.2s',
                  }}
                >
                  {saving ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </button>
              </div>
            </form>

            {/* Live Preview Card */}
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #E4E7ED', padding: '24px', boxShadow: '0 2px 12px rgba(0,17,120,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  Pratinjau Langsung (Live Preview) Topbar Publik
                </div>
                <span style={{ fontSize: '11px', background: '#E0F2FE', color: '#0369A1', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                  Realtime Preview
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: 0, marginBottom: '16px' }}>
                Berikut adalah gambaran bagaimana bagian paling atas (*topbar*) web publik akan tampak oleh pengunjung:
              </p>

              {/* Simulated Public Topbar */}
              <div className="gov-topbar" style={{ borderRadius: '10px', overflow: 'hidden', pointerEvents: 'none' }}>
                <div className="gov-topbar-inner">
                  <div className="gov-topbar-left">
                    <div className="gov-topbar-item">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>{formData.header_telepon || 'Telp: (021) 875-8605'}</span>
                    </div>
                    <div className="gov-topbar-divider" />
                    <div className="gov-topbar-item">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{formData.header_jam_layanan || 'Jam Layanan: Senin – Jumat (08.00 – 16.00 WIB)'}</span>
                    </div>
                  </div>
                  <div className="gov-topbar-right">
                    <span className="gov-topbar-link">
                      <span>Portal Kab. Bogor</span>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </span>
                    <div className="gov-topbar-divider" />
                    <span className="gov-topbar-link">
                      <span>Portal EKABO</span>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
