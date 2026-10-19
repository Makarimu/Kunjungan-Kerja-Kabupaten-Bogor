import { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import { getApprovedReviews } from '../api/review';
import { getPublicSettings } from '../api/settings';
import BogorMap from '../components/common/BogorMap';
import { assetUrl } from '../utils/url';

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const alurRef = useRef<HTMLDivElement>(null);
  const ketentuanRef = useRef<HTMLDivElement>(null);
  const petaRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const reviewSliderRef = useRef<HTMLDivElement>(null);
  const eksplorasiRef = useRef<HTMLDivElement>(null);
  const [alurBtnLeft, setAlurBtnLeft] = useState(true);
  const [alurBtnRight, setAlurBtnRight] = useState(false);
  const [reviewBtnLeft, setReviewBtnLeft] = useState(true);
  const [reviewBtnRight, setReviewBtnRight] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [minHari, setMinHari] = useState<number>(1);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollAlur = (dir: number) => {
    if (!alurRef.current) return;
    const step = alurRef.current.clientWidth * 0.6;
    alurRef.current.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const scrollReview = (dir: number) => {
    if (!reviewSliderRef.current) return;
    const el = reviewSliderRef.current;
    const step = el.clientWidth * 0.75;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const updateReviewBtnState = () => {
    if (!reviewSliderRef.current) return;
    const el = reviewSliderRef.current;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setReviewBtnLeft(el.scrollLeft <= 6);
    setReviewBtnRight(el.scrollLeft >= maxScroll - 6);
  };

  const updateAlurBtnState = () => {
    if (!alurRef.current) return;
    const el = alurRef.current;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setAlurBtnLeft(el.scrollLeft <= 4);
    setAlurBtnRight(el.scrollLeft >= maxScroll - 4);
  };

  useEffect(() => {
    let isMounted = true;
    const el = alurRef.current;
    if (el) {
      el.addEventListener('scroll', updateAlurBtnState);
      window.addEventListener('resize', updateAlurBtnState);
      updateAlurBtnState();
    }

    getApprovedReviews()
      .then((res) => {
        if (isMounted && res && res.success && res.data) {
          setReviews(res.data);
        }
      })
      .catch((err) => {
        if (isMounted) console.error('Error fetching approved reviews:', err);
      });

    getPublicSettings()
      .then((res) => {
        if (isMounted && res?.data?.min_hari_kunjungan) {
          setMinHari(Number(res.data.min_hari_kunjungan));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (el) {
        el.removeEventListener('scroll', updateAlurBtnState);
      }
      window.removeEventListener('resize', updateAlurBtnState);
    };
  }, []);

  useEffect(() => {
    const el = reviewSliderRef.current;
    if (el) {
      el.addEventListener('scroll', updateReviewBtnState, { passive: true });
      window.addEventListener('resize', updateReviewBtnState);
      updateReviewBtnState();
    }
    return () => {
      if (el) el.removeEventListener('scroll', updateReviewBtnState);
      window.removeEventListener('resize', updateReviewBtnState);
    };
  }, [reviews]);

  useEffect(() => {
    const targetHash = location.hash || window.location.hash;
    if (targetHash === '#ketentuan-section') {
      const timer = setTimeout(() => {
        const el = ketentuanRef.current || document.getElementById('ketentuan-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
    if (targetHash === '#eksplorasi-section' || targetHash === '#panduan-layanan') {
      const timer = setTimeout(() => {
        const el = eksplorasiRef.current || document.getElementById('eksplorasi-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  const heroBgImage = assetUrl('/image/tegarberiman.jpeg');

  return (
    <PublicLayout>
      {/* ===== GRAND HERO SECTION ===== */}
      <section
        className="hero gov-grand-hero"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(0, 17, 120, 0.92) 0%, rgba(0, 40, 179, 0.88) 55%, rgba(24, 131, 255, 0.82) 100%), url(${heroBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="hero-inner gov-hero-inner">
          <div className="gov-hero-badge">
            <span>PORTAL RESMI PELAYANAN KUNJUNGAN KERJA KABUPATEN BOGOR</span>
          </div>

          <h1 className="gov-hero-title">
            Selamat Datang di Portal Kunjungan Kerja
          </h1>

          <p className="gov-hero-desc">
            Portal resmi satu pintu pengajuan permohonan kunjungan kerja, koordinasi dinas, dan studi komparasi ke seluruh instansi Pemerintah Kabupaten Bogor. Terintegrasi secara cepat, transparan, dan terhubung langsung dengan instansi tujuan.
          </p>

          <div className="hero-actions gov-hero-actions">
            <button className="btn btn-hero-primary" onClick={() => navigate('/permohonan')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                <path d="M9 13h6M9 17h6" />
              </svg>
              <span>Ajukan Permohonan</span>
            </button>
            <button className="btn btn-hero-ghost" onClick={() => scrollToSection(ketentuanRef)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Ketentuan Kunjungan</span>
            </button>
          </div>
        </div>
      </section>

      {/* ===== FLOATING QUICK ACCESS CARDS ===== */}
      <div className="gov-quick-wrapper">
        <div className="gov-quick-container">
          <div className="gov-quick-grid">

            {/* Card 1: Peta Wilayah */}
            <div className="gov-quick-card" onClick={() => scrollToSection(petaRef)} role="button" tabIndex={0}>
              <div className="gov-quick-icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div className="gov-quick-title">Peta Wilayah</div>
              <div className="gov-quick-desc">Sebaran kantor &amp; lokasi instansi di Kab. Bogor</div>
            </div>

            {/* Card 2: Ulasan Instansi */}
            <div className="gov-quick-card" onClick={() => navigate('/riwayat-kunjungan')} role="button" tabIndex={0}>
              <div className="gov-quick-icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="gov-quick-title">Riwayat Kunjungan</div>
              <div className="gov-quick-desc">Pengalaman instansi yang telah berkunjung</div>
            </div>

            {/* Card 3: Explore Wisata */}
            <div
              className="gov-quick-card"
              onClick={() => scrollToSection(eksplorasiRef)}
              role="button"
              tabIndex={0}
            >
              <div className="gov-quick-icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
              <div className="gov-quick-title">Explore Wisata</div>
              <div className="gov-quick-desc">Portal resmi akomodasi &amp; wisata EKABO</div>
            </div>

          </div>
        </div>
      </div>

      {/* ===== NOTICE RIBBON ===== */}
      <div className="gov-ribbon-wrapper">
        <div className="gov-ribbon-inner">
          <div className="gov-ribbon-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="gov-ribbon-text">
            <strong>Pemberitahuan Wajib:</strong> Sesuai Surat Edaran Bupati Bogor No. 727 Tahun 2025, kunjungan kerja lebih dari 1 (satu) hari <strong>diwajibkan untuk menginap</strong><br />di hotel/penginapan wilayah Kabupaten Bogor.
          </div>
          <button className="gov-ribbon-btn" onClick={() => scrollToSection(ketentuanRef)}>
            Pelajari Ketentuan &rarr;
          </button>
        </div>
      </div>

      <div className="container">
        {/* ===== ALUR PERMOHONAN ===== */}
        <section className="gov-landing-section">
          <div className="section-head">
            <div className="section-tag">Tahapan Pelayanan</div>
            <h2>Alur Permohonan Kunjungan Kerja</h2>
            <p>Ikuti 6 langkah mudah berikut untuk mengajukan permohonan kunjungan kerja Anda secara tertib dan transparan.</p>
          </div>

          <div className="alur-outer">
            <button
              type="button"
              className="alur-scroll-btn left"
              onClick={() => scrollAlur(-1)}
              aria-label="Geser ke kiri"
              disabled={alurBtnLeft}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="alur-scroll-btn right"
              onClick={() => scrollAlur(1)}
              aria-label="Geser ke kanan"
              disabled={alurBtnRight}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            <div className="alur-card-wrap" ref={alurRef}>
              <div className="alur-grid">

                <div className="alur-step">
                  <div className="alur-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </div>
                  <p>1. Pilih Tanggal Kunjungan</p>
                </div>
                <div className="alur-connector" />

                <div className="alur-step">
                  <div className="alur-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="8" r="3" />
                      <path d="M4 19c0-3 2.5-5 5-5s5 2 5 5" />
                      <path d="M14 9h6M14 13h6M14 17h4" />
                    </svg>
                  </div>
                  <p>2. Lengkapi Data Pemohon</p>
                </div>
                <div className="alur-connector" />

                <div className="alur-step">
                  <div className="alur-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                      <path d="M9 13h6M9 17h6" />
                    </svg>
                  </div>
                  <p>3. Unggah Surat Pendukung</p>
                </div>
                <div className="alur-connector" />

                <div className="alur-step">
                  <div className="alur-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2 11 13" />
                      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
                    </svg>
                  </div>
                  <p>4. Kirim &amp; Simpan Kode</p>
                </div>
                <div className="alur-connector" />

                <div className="alur-step">
                  <div className="alur-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 21h3M21 14v3" />
                    </svg>
                  </div>
                  <p>5. Verifikasi &amp; Hasil</p>
                </div>
                <div className="alur-connector" />

                <div className="alur-step">
                  <div className="alur-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p>
                    6. Upload Bukti Menginap<br />
                    <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text-sub)' }}>(Jika Menginap &gt; 1 Hari)</span>
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ===== PETA INTERAKTIF SECTION ===== */}
        <section id="peta-section" ref={petaRef} className="gov-landing-section">
          <div className="section-head">
            <div className="section-tag">Geografis &amp; Lokasi</div>
            <h2>Peta Sebaran Instansi &amp; Perangkat Daerah</h2>
            <p>Eksplorasi batas wilayah administrasi dan lokasi kantor perangkat daerah di lingkungan Pemerintah Kabupaten Bogor.</p>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <BogorMap />
          </div>
        </section>

        {/* ===== KETENTUAN KUNJUNGAN KERJA ===== */}
        <section id="ketentuan-section" ref={ketentuanRef} className="gov-landing-section">
          <div className="section-head">
            <div className="section-tag">Dasar Regulasi</div>
            <h2>Ketentuan Kunjungan Kerja</h2>
            <p>Mohon membaca dan memahami ketentuan berikut sebelum mengajukan permohonan kunjungan kerja.</p>
          </div>

          <div className="ketentuan-card">
            <p className="ketentuan-dasar">
              <strong>Dasar:</strong> Surat Edaran Bupati Bogor Nomor: 727 Tahun 2025 Tentang Ketentuan Pelaksanaan Pelayanan Kegiatan Penerimaan Kunjungan Kerja Dan/Atau Sejenis di Kabupaten Bogor.
            </p>
            <ol className="ketentuan-list">
              <li>1. Kegiatan Kunjungan Kerja dan/atau sejenis lainnya dilaksanakan pada hari Senin s.d. Jum'at (5 hari kerja).</li>
              <li>2. Menyampaikan surat permohonan kunjungan kerja paling lambat 7 (tujuh) hari sebelum kegiatan dilaksanakan.</li>
              <li>
                3. Kegiatan kunjungan kerja yang dilaksanakan lebih dari 1 (satu) hari di wilayah Kabupaten Bogor{' '}
                <strong>DIWAJIBKAN UNTUK MENGINAP</strong> di hotel/penginapan yang berada di wilayah Kabupaten Bogor dan melampirkan bukti pemesanan akomodasi atau dokumen sejenis lainnya.
              </li>
              <li>
                4. Dalam hal tamu tidak melaksanakan ketentuan maka Bupati/Kepala Perangkat Daerah terkait tidak dapat menerima kegiatan kunjungan kerja dan/atau kegiatan sejenis lainnya.
              </li>
            </ol>
            <div className="ketentuan-action">
              <a
                href="/dokumen/surat-edaran-727.html"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-unduh-se"
                title="Buka Dokumen Surat Edaran Bupati Bogor Nomor: 727 Tahun 2025"
              >
                Lihat Surat Edaran Bupati Bogor Nomor: 727 Tahun 2025
              </a>
            </div>
          </div>

          {/* ===== INFO CARDS (DOKUMEN & PERSYARATAN) ===== */}
          <div className="info-grid">
            <div className="info-card">
              <div className="info-card-head">
                <div className="info-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                  </svg>
                </div>
                <h3>Dokumen yang Diperlukan</h3>
              </div>
              <ul>
                <li>Surat Permohonan Kunjungan Kerja resmi berkop instansi</li>
                <li>Lampiran Daftar Pertanyaan atau agenda topik studi komparasi</li>
                <li>Identitas narahubung/PIC (nama, jabatan, nomor WhatsApp aktif, email)</li>
                <li>Rincian jumlah peserta dan estimasi waktu kunjungan</li>
              </ul>
            </div>

            <div className="info-card">
              <div className="info-card-head">
                <div className="info-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <h3>Hal yang Perlu Diperhatikan</h3>
              </div>
              <ul>
                <li>Pengajuan minimal {minHari} hari sebelum rencana tanggal kunjungan</li>
                <li>Proses review dan disposisi oleh admin memakan waktu 1–3 hari kerja</li>
                <li>Simpan Kode Permohonan unik untuk memantau status secara berkala</li>
                <li>Pemberitahuan status resmi dikirimkan secara otomatis via email</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIAL REVIEW SECTION ===== */}
        {reviews.length > 0 && (
          <section id="review-section" ref={reviewRef} className="gov-landing-section">
            <div className="section-head-with-action">
              <div className="section-head-content">
                <div className="section-tag">Ulasan &amp; Kepuasan</div>
                <h2>Apa Kata Instansi yang Pernah Berkunjung</h2>
                <p>Transparansi dan dedikasi pelayanan terbaik dari Pemerintah Kabupaten Bogor untuk seluruh instansi sahabat.</p>
              </div>
              <div className="section-head-action">
                <button
                  type="button"
                  className="btn-review-more"
                  onClick={() => navigate('/riwayat-kunjungan')}
                >
                  <span>Lihat Selengkapnya</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="review-slider-wrapper">
              <button
                type="button"
                className="review-nav-btn left"
                onClick={() => scrollReview(-1)}
                aria-label="Geser ulasan ke kiri"
                disabled={reviewBtnLeft}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                className="review-nav-btn right"
                onClick={() => scrollReview(1)}
                aria-label="Geser ulasan ke kanan"
                disabled={reviewBtnRight}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>

              <div className="review-slider-track" ref={reviewSliderRef}>
                {reviews.map((rev: any) => (
                  <div key={rev.id} className="review-slider-card">
                    <div>
                      <div style={{ color: '#F59E0B', fontSize: '18px', marginBottom: '12px' }}>
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                      </div>
                      <p style={{ fontSize: '13.5px', color: 'var(--text-main)', lineHeight: '1.7', fontStyle: 'italic', marginBottom: '18px' }}>
                        "{rev.review}"
                      </p>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--blue-900)' }}>
                        {rev.dinas_tujuan || 'Pemerintah Kabupaten Bogor'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginBottom: '6px' }}>
                        Pemerintah Kabupaten Bogor
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>Ulasan dari:</span>
                        <span style={{ fontWeight: '600', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rev.instansi || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ===== EKSPLORASI & PANDUAN (EKABO + VIDEO TUTORIAL) ===== */}
        <section id="eksplorasi-section" ref={eksplorasiRef} className="gov-landing-section">
          <div className="section-head">
            <div className="section-tag">Panduan &amp; Informasi Daerah</div>
            <h2>Panduan Layanan &amp; Wisata Kabupaten Bogor</h2>
            <p>Simak video panduan tata cara pengajuan permohonan kunjungan kerja serta jelajahi rekomendasi akomodasi resmi di Kabupaten Bogor.</p>
          </div>

          <div className="gov-explore-grid">
            {/* Video Tutorial Permohonan (Kiri) */}
            <div className="gov-video-card">
              <div className="gov-video-card-header">
                <div className="gov-video-badge">
                  <span>Video Panduan Pengguna</span>
                </div>
                <h4 className="gov-video-title">Tutorial Pengajuan Permohonan Kunjungan Kerja</h4>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0', lineHeight: '1.5' }}>
                  Panduan langkah demi langkah bagi instansi pemohon dalam mengisi formulir, melengkapi berkas, hingga memantau status kunjungan kerja.
                </p>
              </div>
              <div className="gov-video-embed">
                <iframe
                  src="https://www.youtube.com/embed/benN68yUAJE"
                  title="Tutorial Pengajuan Permohonan Kunjungan Kerja"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Kartu Portal EKABO (Kanan) */}
            <div className="gov-video-card">
              <div className="gov-video-card-header">
                <div className="gov-ekabo-badge">
                  <span>Portal Wisata Resmi</span>
                </div>
                <h4 className="gov-video-title">Jelajahi Wisata &amp; Akomodasi Resmi</h4>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0', lineHeight: '1.5' }}>
                  Temukan referensi hotel dan penginapan resmi terverifikasi, kuliner khas, dan destinasi wisata menarik selama kunjungan kerja di Kabupaten Bogor melalui EKABO.
                </p>
              </div>
              <div className="gov-ekabo-media-box">
                <img
                  src={assetUrl('/image/explore_bogor_banner.jpg')}
                  alt="Wisata & Akomodasi Kabupaten Bogor"
                  className="gov-ekabo-media-img"
                />
                <div className="gov-ekabo-media-overlay">
                  <div className="gov-ekabo-media-pills">
                    <span className="gov-ekabo-media-pill">Hotel &amp; Penginapan</span>
                    <span className="gov-ekabo-media-pill">Kuliner Khas</span>
                    <span className="gov-ekabo-media-pill">Destinasi Wisata</span>
                  </div>
                  <a
                    href="https://ekabo.bogorkab.go.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ekabo-visit"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    <span>Kunjungi Portal EKABO</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
