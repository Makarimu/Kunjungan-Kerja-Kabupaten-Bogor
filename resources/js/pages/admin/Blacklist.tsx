import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';

interface BlacklistItem {
  id: number;
  tipe: 'email' | 'instansi';
  nilai: string;
  alasan: string | null;
  status: 'aktif' | 'nonaktif';
  created_by: string | null;
  created_at: string;
}

export default function Blacklist() {
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [stats, setStats] = useState({ total: 0, email: 0, instansi: 0, aktif: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BlacklistItem | null>(null);
  const [formData, setFormData] = useState({
    tipe: 'email' as 'email' | 'instansi',
    nilai: '',
    alasan: '',
    status: 'aktif' as 'aktif' | 'nonaktif',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBlacklist = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/blacklist', {
        params: {
          search: search || undefined,
          tipe: filterTipe || undefined,
          status: filterStatus || undefined,
        },
      });
      if (res.data?.success) {
        setItems(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal memuat daftar blokir.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, [filterTipe, filterStatus]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchBlacklist();
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      tipe: 'email',
      nilai: '',
      alasan: '',
      status: 'aktif',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: BlacklistItem) => {
    setEditingItem(item);
    setFormData({
      tipe: item.tipe,
      nilai: item.nilai,
      alasan: item.alasan || '',
      status: item.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nilai.trim()) {
      showToast('Nilai email atau instansi wajib diisi.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        const res = await api.put(`/admin/blacklist/${editingItem.id}`, formData);
        if (res.data?.success) {
          showToast(res.data.message || 'Data blokir berhasil diperbarui.');
          setShowModal(false);
          fetchBlacklist();
        }
      } else {
        const res = await api.post('/admin/blacklist', formData);
        if (res.data?.success) {
          showToast(res.data.message || 'Data blokir berhasil ditambahkan.');
          setShowModal(false);
          fetchBlacklist();
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: BlacklistItem) => {
    try {
      const res = await api.patch(`/admin/blacklist/${item.id}/toggle-status`);
      if (res.data?.success) {
        showToast(`Status blokir untuk "${item.nilai}" berhasil diubah.`);
        setItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, status: i.status === 'aktif' ? 'nonaktif' : 'aktif' } : i))
        );
        setStats(prev => ({
          ...prev,
          aktif: item.status === 'aktif' ? prev.aktif - 1 : prev.aktif + 1,
        }));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal mengubah status.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/admin/blacklist/${id}`);
      if (res.data?.success) {
        showToast('Data blokir berhasil dihapus.');
        setDeleteConfirmId(null);
        fetchBlacklist();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menghapus data.', 'error');
    }
  };

  return (
    <AdminLayout>
      <style>{`
        .bl-card { background: white; border-radius: 14px; border: 1px solid #E2E8F0; padding: 20px; transition: all 0.2s; }
        .bl-card:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.04); }
        .bl-badge-email { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; }
        .bl-badge-instansi { background: #FDF4FF; color: #86198F; border: 1px solid #F5D0FE; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; }
        .bl-badge-aktif { background: #DCFCE7; color: #166534; border: 1px solid #BBF7D0; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 6px; }
        .bl-badge-nonaktif { background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 6px; }
        .switch-btn { position: relative; width: 40px; height: 22px; border-radius: 20px; background: #CBD5E1; cursor: pointer; transition: background 0.2s; border: none; padding: 2px; }
        .switch-btn.active { background: #0028B3; }
        .switch-dot { width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .switch-btn.active .switch-dot { transform: translateX(18px); }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 22px', borderRadius: '10px', color: 'white', fontSize: '13.5px', fontWeight: '600', zIndex: 9999, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', background: toast.type === 'error' ? '#B91C1C' : '#001178', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#001178', letterSpacing: '-0.3px', margin: 0 }}>
            Daftar Pencegahan (Blacklist)
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Kelola daftar email dan instansi yang diblokir otomatis untuk mencegah spam atau no-show berulang.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
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
          }}
        >
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
          <span>Tambah Blokir</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="bl-card" style={{ borderLeft: '4px solid #0028B3' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Blokir</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#001178', marginTop: '4px' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Data terblokir</div>
        </div>
        <div className="bl-card" style={{ borderLeft: '4px solid #4338CA' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Terblokir</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#4338CA', marginTop: '4px' }}>{stats.email}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Alamat email diblokir</div>
        </div>
        <div className="bl-card" style={{ borderLeft: '4px solid #86198F' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Instansi Terblokir</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#86198F', marginTop: '4px' }}>{stats.instansi}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Nama instansi diblokir</div>
        </div>
        <div className="bl-card" style={{ borderLeft: '4px solid #16A34A' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Aktif</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#16A34A', marginTop: '4px' }}>{stats.aktif}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Sedang diblokir</div>
        </div>
      </div>

      {/* Info Notice */}
      <div style={{ background: '#F0F6FF', border: '1px solid #C5DBFF', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0028B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p style={{ fontSize: '13px', color: '#001178', lineHeight: '1.5', margin: 0 }}>
          Email atau instansi yang berstatus <strong>Aktif</strong> akan otomatis diblokir oleh sistem ketika mencoba mengisi formulir permohonan kunjungan kerja maupun pengajuan revisi.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cari email, instansi, atau alasan blokir..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={filterTipe}
            onChange={e => setFilterTipe(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', color: '#334155', background: 'white', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Semua Tipe</option>
            <option value="email">Email</option>
            <option value="instansi">Instansi</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', color: '#334155', background: 'white', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Table List */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 18px', width: '50px' }}>No</th>
                <th style={{ padding: '14px 18px', width: '120px' }}>Tipe</th>
                <th style={{ padding: '14px 18px' }}>Email / Instansi yang Diblokir</th>
                <th style={{ padding: '14px 18px' }}>Alasan Blokir</th>
                <th style={{ padding: '14px 18px', width: '110px' }}>Status</th>
                <th style={{ padding: '14px 18px', width: '150px' }}>Oleh / Tanggal</th>
                <th style={{ padding: '14px 18px', width: '110px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid #C5DBFF', borderTopColor: '#0028B3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                    Memuat data blokir...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#1E293B' }}>Belum ada data blokir</div>
                    <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
                      {search ? 'Tidak ada data yang cocok dengan pencarian Anda.' : 'Tambahkan email atau instansi ke daftar blokir untuk memblokir spam.'}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px 18px', color: '#64748B' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 18px' }}>
                      {item.tipe === 'email' ? (
                        <span className="bl-badge-email">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          Email
                        </span>
                      ) : (
                        <span className="bl-badge-instansi">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                          Instansi
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0F172A' }}>
                      {item.nilai}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569', fontSize: '13px' }}>
                      {item.alasan || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Tidak ada keterangan</span>}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className={`switch-btn ${item.status === 'aktif' ? 'active' : ''}`}
                          onClick={() => handleToggleStatus(item)}
                          title={`Klik untuk ${item.status === 'aktif' ? 'nonaktifkan' : 'aktifkan'}`}
                        >
                          <div className="switch-dot" />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: item.status === 'aktif' ? '#166534' : '#64748B' }}>
                          {item.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '12px', color: '#64748B' }}>
                      <div>{item.created_by || 'Admin'}</div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
                        {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', color: '#334155', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          title="Hapus"
                        >
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
      </div>

      {/* Modal Tambah / Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,17,120,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#001178', margin: 0 }}>
                {editingItem ? 'Edit Data Blokir' : 'Tambah Data Blokir'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Pilihan Tipe */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  Tipe Blokir <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${formData.tipe === 'email' ? '#0028B3' : '#E2E8F0'}`, background: formData.tipe === 'email' ? '#EEF2FF' : 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    <input
                      type="radio"
                      name="tipe"
                      value="email"
                      checked={formData.tipe === 'email'}
                      onChange={() => setFormData({ ...formData, tipe: 'email' })}
                    />
                    ✉️ Alamat Email
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${formData.tipe === 'instansi' ? '#0028B3' : '#E2E8F0'}`, background: formData.tipe === 'instansi' ? '#FDF4FF' : 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    <input
                      type="radio"
                      name="tipe"
                      value="instansi"
                      checked={formData.tipe === 'instansi'}
                      onChange={() => setFormData({ ...formData, tipe: 'instansi' })}
                    />
                    🏛️ Nama Instansi
                  </label>
                </div>
              </div>

              {/* Input Nilai */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  {formData.tipe === 'email' ? 'Alamat Email yang Diblokir' : 'Nama Instansi yang Diblokir'} <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type={formData.tipe === 'email' ? 'email' : 'text'}
                  placeholder={formData.tipe === 'email' ? 'contoh: spammer@domain.com' : 'contoh: Dinas Pariwisata Fiktif'}
                  value={formData.nilai}
                  onChange={e => setFormData({ ...formData, nilai: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Input Alasan */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Alasan Blokir / Catatan
                </label>
                <textarea
                  rows={3}
                  placeholder="contoh: Tidak hadir (no-show) tanpa konfirmasi 3x berturut-turut."
                  value={formData.alasan}
                  onChange={e => setFormData({ ...formData, alasan: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* Status Aktif Switch */}
              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>Status Blokir</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Aktifkan untuk langsung memblokir pengajuan</div>
                </div>
                <button
                  type="button"
                  className={`switch-btn ${formData.status === 'aktif' ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, status: formData.status === 'aktif' ? 'nonaktif' : 'aktif' })}
                >
                  <div className="switch-dot" />
                </button>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: '#0028B3', color: 'white', fontSize: '13px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Blokir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,17,120,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '400px', width: '100%', padding: '24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗑️</div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px 0' }}>Hapus Data Blokir?</h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              Data ini akan dihapus dari daftar blokir. Email atau instansi terkait akan kembali dapat mengajukan permohonan kunjungan.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#DC2626', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
