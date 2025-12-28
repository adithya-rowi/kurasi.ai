import { useState } from 'react';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { Check, Loader2 } from 'lucide-react';

const SOURCES = {
  indonesia: ['Kontan', 'Bisnis Indonesia', 'Kompas', 'Tempo', 'CNBC Indonesia', 'Katadata'],
  asia: ['Straits Times', 'Nikkei Asia', 'Channel News Asia', 'SCMP'],
  global: ['Bloomberg', 'Reuters', 'Financial Times', 'The Economist', 'WSJ']
};

const TOPICS = [
  'Ekonomi Makro', 'Perbankan & Keuangan', 'Kebijakan Pemerintah', 
  'Teknologi & AI', 'Startup & Venture', 'Energi & Resources', 
  'Properti', 'Pasar Modal'
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [state, setState] = useState({
    sources: [] as string[],
    customSources: '',
    topics: [] as string[],
    institutions: '',
    voices: '',
    time: '06:00',
    email: ''
  });

  const toggleSource = (source: string) => {
    setState(prev => ({
      ...prev,
      sources: prev.sources.includes(source) 
        ? prev.sources.filter(s => s !== source)
        : [...prev.sources, source]
    }));
  };

  const toggleTopic = (topic: string) => {
    setState(prev => ({
      ...prev,
      topics: prev.topics.includes(topic) 
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic]
    }));
  };

  const canProceedStep1 = state.sources.length > 0 || state.customSources.trim().length > 0;
  const canProceedStep2 = state.topics.length > 0;
  const canSubmit = state.email.includes('@');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: `Eksekutif yang fokus pada ${state.topics.join(', ')}`,
          topics: state.topics.join(', '),
          entities: state.voices + (state.institutions ? `, ${state.institutions}` : ''),
          sources: [...state.sources, state.customSources].filter(Boolean).join(', ')
        })
      });

      const data = await res.json();
      
      if (data.profile) {
        sessionStorage.setItem('kurasiProfile', JSON.stringify(data.profile));
        sessionStorage.setItem('kurasiEmail', state.email);
        sessionStorage.setItem('kurasiTime', state.time);
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const progressWidth = success ? 100 : (currentStep / 3) * 100;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', color: '#0a1628', minHeight: '100vh' }}>
      <style>{`
        .serif { font-family: 'Cormorant Garamond', serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-up { animation: fadeUp 0.6s ease forwards; }
        .animate-fade-in { animation: fadeIn 0.4s ease; }
      `}</style>

      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '1rem 4%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fff',
        borderBottom: '1px solid #e5e5e5'
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#0a1628',
          letterSpacing: '0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: '#cc2936',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 700
          }}>K</div>
          KURASI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/how-it-works" style={{ fontSize: '0.875rem', color: '#2a3f5f', textDecoration: 'none', fontWeight: 500 }}>Tentang</Link>
          <Link href="/login" style={{ fontSize: '0.875rem', color: '#2a3f5f', textDecoration: 'none', fontWeight: 500 }}>Masuk</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: 60 }}>
        <div style={{
          background: '#0a1628',
          padding: '4rem 4% 6rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(204, 41, 54, 0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(204, 41, 54, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          <div style={{ maxWidth: 800, position: 'relative', zIndex: 2 }}>
            <div className="animate-fade-up" style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#cc2936',
              marginBottom: '1.5rem'
            }}>Executive Intelligence</div>
            <h1 className="serif animate-fade-up" style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: '#fff',
              marginBottom: '1.5rem',
              animationDelay: '0.1s'
            }}>
              Puluhan sumber berita.<br />Satu email terkurasi.
            </h1>
            <p className="animate-fade-up" style={{
              fontSize: '1.125rem',
              color: '#94a3b8',
              maxWidth: 600,
              lineHeight: 1.7,
              animationDelay: '0.2s'
            }}>
              Jawab 3 pertanyaan, dan brief eksekutif pertama Anda akan tiba besok pagi.
            </p>
          </div>
        </div>

        {/* Onboarding Section */}
        <div style={{ flex: 1, padding: '3rem 4%', background: '#fff' }}>
          <div style={{ maxWidth: 800 }}>
            {/* Progress Bar */}
            <div style={{ height: 3, background: '#e5e5e5', marginBottom: '2rem' }}>
              <div style={{ height: '100%', background: '#cc2936', width: `${progressWidth}%`, transition: 'width 0.3s ease' }} />
            </div>

            {/* Step 1: Sources */}
            {currentStep === 1 && !success && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0a1628' }}>1. Sumber apa yang ingin kami baca untuk Anda?</span>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Pertanyaan 1 dari 3</span>
                </div>

                <p className="serif" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#0a1628', marginBottom: '1.5rem' }}>Indonesia</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                  {SOURCES.indonesia.map(source => (
                    <Chip key={source} label={source} selected={state.sources.includes(source)} onClick={() => toggleSource(source)} />
                  ))}
                </div>

                <p className="serif" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#0a1628', marginBottom: '1.5rem' }}>ASEAN & Asia</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                  {SOURCES.asia.map(source => (
                    <Chip key={source} label={source} selected={state.sources.includes(source)} onClick={() => toggleSource(source)} />
                  ))}
                </div>

                <p className="serif" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#0a1628', marginBottom: '1.5rem' }}>Global</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                  {SOURCES.global.map(source => (
                    <Chip key={source} label={source} selected={state.sources.includes(source)} onClick={() => toggleSource(source)} />
                  ))}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ fontSize: '0.875rem', color: '#2a3f5f', marginBottom: '0.5rem', display: 'block' }}>
                    Sumber lain? Newsletter, Substack, podcast, atau akun X yang Anda ikuti
                  </label>
                  <input
                    type="text"
                    value={state.customSources}
                    onChange={(e) => setState(prev => ({ ...prev, customSources: e.target.value }))}
                    placeholder="Contoh: Morning Brew, Stratechery, Lex Fridman Podcast"
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      fontSize: '1rem',
                      fontFamily: "'DM Sans', sans-serif",
                      color: '#0a1628',
                      outline: 'none'
                    }}
                    data-testid="input-custom-sources"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '2rem' }}>
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!canProceedStep1}
                    style={{
                      background: canProceedStep1 ? '#cc2936' : '#d1d5db',
                      color: '#fff',
                      padding: '1rem 2rem',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: canProceedStep1 ? 'pointer' : 'not-allowed',
                      fontFamily: "'DM Sans', sans-serif"
                    }}
                    data-testid="button-next-1"
                  >
                    Lanjut →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Focus */}
            {currentStep === 2 && !success && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0a1628' }}>2. Apa fokus Anda?</span>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Pertanyaan 2 dari 3</span>
                </div>

                <p className="serif" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#0a1628', marginBottom: '1.5rem' }}>Topik</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                  {TOPICS.map(topic => (
                    <Chip key={topic} label={topic} selected={state.topics.includes(topic)} onClick={() => toggleTopic(topic)} />
                  ))}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ fontSize: '0.875rem', color: '#2a3f5f', marginBottom: '0.5rem', display: 'block' }}>
                    Institusi yang ingin dipantau
                  </label>
                  <input
                    type="text"
                    value={state.institutions}
                    onChange={(e) => setState(prev => ({ ...prev, institutions: e.target.value }))}
                    placeholder="Contoh: Bank Indonesia, OJK, Kementerian Keuangan, The Fed"
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      fontSize: '1rem',
                      fontFamily: "'DM Sans', sans-serif",
                      color: '#0a1628',
                      outline: 'none'
                    }}
                    data-testid="input-institutions"
                  />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ fontSize: '0.875rem', color: '#2a3f5f', marginBottom: '0.5rem', display: 'block' }}>
                    Tokoh atau pemikir yang Anda ikuti
                  </label>
                  <input
                    type="text"
                    value={state.voices}
                    onChange={(e) => setState(prev => ({ ...prev, voices: e.target.value }))}
                    placeholder="Contoh: Paul Krugman, Martin Wolf, Sri Mulyani, Chatib Basri"
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      fontSize: '1rem',
                      fontFamily: "'DM Sans', sans-serif",
                      color: '#0a1628',
                      outline: 'none'
                    }}
                    data-testid="input-voices"
                  />
                  <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    Bisa dari Substack, X, podcast, atau kolumnis yang Anda nilai
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '2rem' }}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2a3f5f',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      padding: '0.5rem 0',
                      fontFamily: "'DM Sans', sans-serif"
                    }}
                    data-testid="button-back-2"
                  >
                    ← Kembali
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!canProceedStep2}
                    style={{
                      background: canProceedStep2 ? '#cc2936' : '#d1d5db',
                      color: '#fff',
                      padding: '1rem 2rem',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: canProceedStep2 ? 'pointer' : 'not-allowed',
                      fontFamily: "'DM Sans', sans-serif"
                    }}
                    data-testid="button-next-2"
                  >
                    Lanjut →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Delivery */}
            {currentStep === 3 && !success && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0a1628' }}>3. Kapan brief Anda dikirim?</span>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Pertanyaan 3 dari 3</span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  {['06:00', '12:00', '18:00'].map((time, idx) => (
                    <div
                      key={time}
                      onClick={() => setState(prev => ({ ...prev, time }))}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        border: `1px solid ${state.time === time ? '#cc2936' : '#d1d5db'}`,
                        borderRadius: 4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: state.time === time ? 'rgba(204, 41, 54, 0.04)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                      data-testid={`time-option-${time}`}
                    >
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0a1628' }}>{time}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#2a3f5f' }}>
                        {idx === 0 ? 'Pagi' : idx === 1 ? 'Siang' : 'Sore'}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#0a1628', marginBottom: '0.5rem' }}>
                    Email Anda
                  </label>
                  <input
                    type="email"
                    value={state.email}
                    onChange={(e) => setState(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="nama@email.com"
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      fontSize: '1rem',
                      fontFamily: "'DM Sans', sans-serif",
                      color: '#0a1628',
                      outline: 'none'
                    }}
                    data-testid="input-email"
                  />
                </div>

                {/* Summary Panel */}
                <div style={{
                  background: '#f9fafb',
                  borderLeft: '3px solid #cc2936',
                  padding: '1.5rem',
                  marginTop: '2rem'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#2a3f5f',
                    marginBottom: '1rem'
                  }}>Ringkasan Preferensi Anda</div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Sumber</div>
                    <div style={{ fontSize: '0.9375rem', color: '#0a1628', fontWeight: 500 }}>
                      {[...state.sources, state.customSources].filter(Boolean).join(', ') || '-'}
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Fokus</div>
                    <div style={{ fontSize: '0.9375rem', color: '#0a1628', fontWeight: 500 }}>
                      {state.topics.join(', ') || '-'}
                    </div>
                  </div>
                  {state.voices && (
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Tokoh</div>
                      <div style={{ fontSize: '0.9375rem', color: '#0a1628', fontWeight: 500 }}>{state.voices}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '2rem' }}>
                  <button
                    onClick={() => setCurrentStep(2)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2a3f5f',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      padding: '0.5rem 0',
                      fontFamily: "'DM Sans', sans-serif"
                    }}
                    data-testid="button-back-3"
                  >
                    ← Kembali
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || loading}
                    style={{
                      background: canSubmit && !loading ? '#cc2936' : '#d1d5db',
                      color: '#fff',
                      padding: '1rem 2rem',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                      fontFamily: "'DM Sans', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    data-testid="button-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Menyiapkan...
                      </>
                    ) : (
                      'Kirim Brief Pertama Saya →'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Success State */}
            {success && (
              <div className="animate-fade-in" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{
                  width: 80,
                  height: 80,
                  background: 'rgba(204, 41, 54, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 2rem'
                }}>
                  <Check size={40} color="#cc2936" />
                </div>
                <h2 className="serif" style={{ fontSize: '2rem', color: '#0a1628', marginBottom: '1rem' }}>
                  Brief Anda Sedang Disiapkan
                </h2>
                <p style={{ fontSize: '1.0625rem', color: '#2a3f5f', maxWidth: 400, margin: '0 auto' }}>
                  Besok pukul <strong>{state.time}</strong>, brief eksekutif pertama Anda akan tiba di <strong>{state.email}</strong>.
                </p>
                <button
                  onClick={() => setLocation('/register')}
                  style={{
                    background: '#cc2936',
                    color: '#fff',
                    padding: '1rem 2rem',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    marginTop: '2rem'
                  }}
                  data-testid="button-create-account"
                >
                  Buat Akun untuk Akses Dashboard →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.625rem 1.25rem',
        border: `1px solid ${selected ? '#cc2936' : '#d1d5db'}`,
        borderRadius: 100,
        fontSize: '0.9375rem',
        color: selected ? '#fff' : '#cc2936',
        background: selected ? '#cc2936' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontWeight: 500
      }}
      data-testid={`chip-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {label}
    </div>
  );
}
