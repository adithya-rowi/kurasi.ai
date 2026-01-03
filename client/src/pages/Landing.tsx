import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { Check, Loader2, ExternalLink } from 'lucide-react';

// Types for EspressoBrief
interface EspressoStory {
  headline: string;
  body: string;
  whyItMatters: string;
  source: string;
  sourceType: 'local' | 'regional' | 'global' | 'social';
  url: string;
  verificationScore: number;
  category: 'critical' | 'important' | 'background';
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
  recencyLabel?: string;
  publishedDate?: string;
}

interface EspressoBrief {
  briefDate: string;
  edition: string;
  recipientName: string;
  greeting: string;
  executiveThesis?: string;
  theWorldInBrief: string;
  topStories: EspressoStory[];
  tokohInsights?: EspressoStory[];
  marketsSnapshot?: string;
  quotaOfTheDay?: {
    quote: string;
    source: string;
  };
  agendaAhead?: string[];
  councilConsensus: string;
  confidenceScore: number;
  sourcesUsed: {
    search: string[];
    analysis: string[];
  };
}

const TOPICS = [
  'Ekonomi Makro', 'Perbankan & Keuangan', 'Kebijakan Pemerintah',
  'Teknologi & AI', 'Startup & Venture', 'Energi & Resources',
  'Properti', 'Pasar Modal'
];

const ROLES = [
  'Investor / Fund Manager',
  'CEO / Founder',
  'Eksekutif Korporat (CFO/COO/Head)',
  'Komisaris / Penasihat Senior',
  'Konsultan / Advisor',
  'Regulator / Pemerintahan',
  'Akademisi / Peneliti',
  'Lainnya'
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<EspressoBrief | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const [state, setState] = useState({
    role: '',
    decisionContext: '',
    topics: [] as string[],
    institutions: '',
    voices: '',
    time: '06:00',
    email: ''
  });

  // Loading messages rotation
  useEffect(() => {
    if (!loading) return;

    const messages = [
      'Menyiapkan brief pertama Anda...',
      'Mencari berita dari berbagai sumber...',
      'Menganalisis relevansi untuk Anda...',
      'Menyusun brief eksekutif...',
      'Hampir selesai...'
    ];

    let idx = 0;
    setLoadingMessage(messages[0]);

    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setLoadingMessage(messages[idx]);
    }, 15000); // Change every 15 seconds

    return () => clearInterval(interval);
  }, [loading]);

  const toggleTopic = (topic: string) => {
    setState(prev => ({
      ...prev,
      topics: prev.topics.includes(topic) 
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic]
    }));
  };

  // Flexible validation: topics OR institutions OR voices
  const hasAnyFocus = state.topics.length > 0 || state.institutions.trim().length > 0 || state.voices.trim().length > 0;

  // Step 1: role is required AND (topics OR institutions OR voices)
  const canProceedStep1 = state.role !== '' && hasAnyFocus;
  // Step 2: email required + at least one focus preference
  const canSubmit = state.email.includes('@') && hasAnyFocus;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: state.role,
          decisionContext: state.decisionContext || null,
          sources: [],
          customSources: '',
          topics: state.topics,
          institutions: state.institutions,
          voices: state.voices,
          email: state.email
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      if (data.success && data.brief) {
        setBrief(data.brief);
        sessionStorage.setItem('loperBrief', JSON.stringify(data.brief));
        sessionStorage.setItem('loperEmail', state.email);
        sessionStorage.setItem('loperTime', state.time);
        setCurrentStep(3); // Go to Step 3: Show brief
      } else {
        setError('Gagal membuat brief. Silakan coba lagi.');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi gagal. Silakan coba lagi.');
    }
    setLoading(false);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback) return;

    // Store feedback locally for now (could send to API)
    sessionStorage.setItem('loperFeedback', JSON.stringify({
      rating: feedback,
      comment: feedbackText,
      email: state.email,
      timestamp: new Date().toISOString()
    }));

    setFeedbackSubmitted(true);
  };

  const progressWidth = brief ? 100 : loading ? 75 : (currentStep / 2) * 100;

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
          }}>L</div>
          LOPER
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
            }}>Personalized Decision Intelligence</div>
            <h1 className="serif animate-fade-up" style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: '#fff',
              marginBottom: '1.5rem',
              animationDelay: '0.1s'
            }}>
              Insights yang mengerti Anda.
            </h1>
            <p className="animate-fade-up" style={{
              fontSize: '1.125rem',
              color: '#94a3b8',
              maxWidth: 600,
              lineHeight: 1.7,
              animationDelay: '0.2s'
            }}>
              Loper memahami peran dan konteks Anda, lalu merangkum informasi menjadi satu brief untuk keputusan yang lebih tepat.
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

            {/* Step 1: Focus */}
            {currentStep === 1 && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0a1628' }}>1. Ceritakan kebutuhan Anda</span>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>1/2</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                  Ini membantu AI menulis 'Mengapa penting' sesuai peran Anda.
                </p>

                {/* Role Selection */}
                <p className="serif" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#0a1628', marginBottom: '1rem' }}>Peran Anda</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                  {ROLES.map(role => (
                    <Chip
                      key={role}
                      label={role}
                      selected={state.role === role}
                      onClick={() => setState(prev => ({ ...prev, role }))}
                    />
                  ))}
                </div>

                {/* Decision Context */}
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ fontSize: '0.875rem', color: '#2a3f5f', marginBottom: '0.5rem', display: 'block' }}>
                    Keputusan yang sedang dipikirkan (opsional)
                  </label>
                  <input
                    type="text"
                    value={state.decisionContext}
                    onChange={(e) => setState(prev => ({ ...prev, decisionContext: e.target.value }))}
                    placeholder="Contoh: alokasi portofolio 2026, ekspansi bisnis ke Vietnam"
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
                    data-testid="input-decision-context"
                  />
                </div>

                <p className="serif" style={{ fontSize: '1.5rem', fontWeight: 500, color: '#0a1628', marginBottom: '1.5rem' }}>Fokus (pilih beberapa)</p>
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
                  {!canProceedStep1 && (
                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      {state.role === '' ? 'Pilih peran Anda' : 'Pilih minimal satu topik, institusi, atau tokoh'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Delivery */}
            {currentStep === 2 && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0a1628' }}>2. Kapan brief Anda dikirim?</span>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>2/2</span>
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

                {/* Context text */}
                <div style={{
                  textAlign: 'center',
                  marginTop: '1.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#94a3b8',
                    margin: 0,
                    lineHeight: 1.6
                  }}>
                    Brief pertama langsung tampil.<br />
                    7 hari berikutnya dikirim ke email — gratis.
                  </p>
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
                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Peran</div>
                    <div style={{ fontSize: '0.9375rem', color: '#0a1628', fontWeight: 500 }}>
                      {state.role || '-'}
                    </div>
                  </div>
                  {state.decisionContext && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Konteks Keputusan</div>
                      <div style={{ fontSize: '0.9375rem', color: '#0a1628', fontWeight: 500 }}>{state.decisionContext}</div>
                    </div>
                  )}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Topik</div>
                    <div style={{ fontSize: '0.9375rem', color: '#0a1628', fontWeight: 500 }}>
                      {state.topics.join(', ') || '-'}
                    </div>
                  </div>
                  {state.institutions && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Institusi</div>
                      <div style={{ fontSize: '0.9375rem', color: '#0a1628', fontWeight: 500 }}>{state.institutions}</div>
                    </div>
                  )}
                  {state.voices && (
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Tokoh</div>
                      <div style={{ fontSize: '0.9375rem', color: '#0a1628', fontWeight: 500 }}>{state.voices}</div>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 4,
                    padding: '1rem',
                    marginTop: '1rem',
                    color: '#dc2626',
                    fontSize: '0.875rem'
                  }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '2rem' }}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: loading ? '#94a3b8' : '#2a3f5f',
                      fontSize: '0.875rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      padding: '0.5rem 0',
                      fontFamily: "'DM Sans', sans-serif"
                    }}
                    data-testid="button-back-2"
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
                      gap: '0.5rem',
                      minWidth: loading ? 280 : 'auto'
                    }}
                    data-testid="button-submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {loadingMessage}
                      </>
                    ) : (
                      'Lihat Brief Pertama Saya →'
                    )}
                  </button>
                </div>

                {/* Loading Explanation */}
                {loading && (
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: '#f0f9ff',
                    borderRadius: 4,
                    fontSize: '0.8125rem',
                    color: '#0369a1'
                  }}>
                    6 AI sedang bekerja untuk Anda. Proses ini memakan waktu 2-3 menit.
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Brief Preview + Feedback */}
            {currentStep === 3 && brief && (
              <div className="animate-fade-in">
                {/* Brief Header - Economist Espresso style */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#cc2936',
                    marginBottom: '1rem'
                  }}>
                    Brief Pertama Anda
                  </div>
                  <h2 className="serif" style={{
                    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                    fontWeight: 400,
                    color: '#0a1628',
                    marginBottom: '0.5rem',
                    lineHeight: 1.2
                  }}>
                    {brief.greeting}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    {brief.briefDate} · {brief.edition}
                  </p>
                  {brief.executiveThesis && (
                    <p style={{
                      fontWeight: 600,
                      fontSize: '1.05em',
                      color: '#1a2a3a',
                      fontStyle: 'italic',
                      margin: '16px 0',
                      padding: '12px 16px',
                      borderLeft: '3px solid #cc2936',
                      background: '#f8f9fa',
                      fontFamily: "'Cormorant Garamond', Georgia, serif"
                    }}>
                      {brief.executiveThesis}
                    </p>
                  )}
                </div>

                {/* The World in Brief - Hero treatment */}
                <div style={{
                  background: '#0a1628',
                  padding: '2rem',
                  marginBottom: '2.5rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(ellipse 80% 60% at 80% 20%, rgba(204, 41, 54, 0.1) 0%, transparent 50%)',
                    pointerEvents: 'none'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: '#cc2936',
                      marginBottom: '1rem'
                    }}>
                      Sekilas Brief
                    </div>
                    <p className="serif" style={{
                      fontSize: '1.125rem',
                      lineHeight: 1.8,
                      color: '#e2e8f0',
                      fontWeight: 400
                    }}>
                      {brief.theWorldInBrief}
                    </p>
                  </div>
                </div>

                {/* Top Stories - Clean editorial layout */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#2a3f5f',
                    marginBottom: '1.5rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid #e5e5e5'
                  }}>
                    Berita Utama
                  </div>

                  {brief.topStories.slice(0, 5).map((story, idx) => (
                    <article
                      key={idx}
                      style={{
                        marginBottom: '2rem',
                        paddingBottom: '2rem',
                        borderBottom: idx < Math.min(brief.topStories.length, 5) - 1 ? '1px solid #e5e5e5' : 'none'
                      }}
                    >
                      {/* Category indicator */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem'
                      }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: story.category === 'critical' ? '#cc2936' : story.category === 'important' ? '#f59e0b' : '#94a3b8'
                        }} />
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: '#94a3b8'
                        }}>
                          {story.category === 'critical' ? 'Kritis' : story.category === 'important' ? 'Penting' : 'Konteks'}
                        </span>
                      </div>

                      {/* Headline */}
                      <h3 className="serif" style={{
                        fontSize: '1.375rem',
                        fontWeight: 500,
                        color: '#0a1628',
                        marginBottom: '0.75rem',
                        lineHeight: 1.3
                      }}>
                        {story.headline}
                      </h3>

                      {/* Body */}
                      <p style={{
                        fontSize: '0.9375rem',
                        color: '#2a3f5f',
                        lineHeight: 1.7,
                        marginBottom: '1rem'
                      }}>
                        {story.body}
                      </p>

                      {/* Why it matters - Subtle highlight */}
                      <div style={{
                        background: '#f9fafb',
                        borderLeft: '2px solid #cc2936',
                        padding: '0.875rem 1rem',
                        marginBottom: '0.75rem'
                      }}>
                        <span style={{
                          fontWeight: 600,
                          color: '#0a1628',
                          fontSize: '0.8125rem'
                        }}>
                          Mengapa penting:{' '}
                        </span>
                        <span style={{
                          color: '#2a3f5f',
                          fontSize: '0.8125rem',
                          lineHeight: 1.6
                        }}>
                          {story.whyItMatters}
                        </span>
                      </div>

                      {/* Source */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#94a3b8'
                      }}>
                        <span>{story.recencyLabel || ''}{story.publishedDate ? ` · ${story.publishedDate}` : ''} · {story.source || ''}</span>
                        {story.url && (
                          <a
                            href={story.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#cc2936',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              textDecoration: 'none',
                              fontSize: '0.75rem'
                            }}
                          >
                            Baca selengkapnya <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                {/* Tokoh Insights Section */}
                {brief.tokohInsights && brief.tokohInsights.length > 0 && (
                  <>
                    <h2 style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: '#1a2a3a',
                      marginTop: '2rem',
                      marginBottom: '1rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid #e5e5e5'
                    }}>
                      📚 Insight Tokoh
                    </h2>
                    {brief.tokohInsights.map((story, index) => (
                      <div key={`tokoh-${index}`} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                          {story.recencyLabel || 'Insight'}{story.publishedDate ? ` · ${story.publishedDate}` : ''} · {story.source || 'Sumber tidak tersedia'}
                        </p>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1a2a3a', marginBottom: '0.5rem' }}>
                          {story.headline}
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                          {story.body}
                        </p>
                        <div style={{
                          background: '#f9fafb',
                          borderLeft: '2px solid #cc2936',
                          padding: '0.875rem 1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <span style={{ fontWeight: 600, color: '#0a1628', fontSize: '0.8125rem' }}>
                            Mengapa penting:{' '}
                          </span>
                          <span style={{ color: '#2a3f5f', fontSize: '0.8125rem', lineHeight: 1.6 }}>
                            {story.whyItMatters}
                          </span>
                        </div>
                        {story.url && (
                          <a href={story.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#cc2936', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            Baca selengkapnya <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* Council Consensus - Matching summary panel style */}
                {brief.councilConsensus && (
                  <div style={{
                    background: '#f9fafb',
                    borderLeft: '3px solid #cc2936',
                    padding: '1.5rem',
                    marginBottom: '2.5rem'
                  }}>
                    <div style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: '#2a3f5f',
                      marginBottom: '0.75rem'
                    }}>
                      Konsensus Dewan AI
                    </div>
                    <p style={{
                      fontSize: '0.9375rem',
                      color: '#2a3f5f',
                      lineHeight: 1.7,
                      marginBottom: '0.75rem'
                    }}>
                      {brief.councilConsensus}
                    </p>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>Tingkat kepercayaan:</span>
                      <span style={{
                        fontWeight: 600,
                        color: brief.confidenceScore >= 8 ? '#059669' : brief.confidenceScore >= 6 ? '#d97706' : '#94a3b8'
                      }}>
                        {brief.confidenceScore.toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                )}

                {/* Feedback Section - Minimal and elegant */}
                {!feedbackSubmitted ? (
                  <div style={{
                    borderTop: '1px solid #e5e5e5',
                    paddingTop: '2rem',
                    marginBottom: '2.5rem'
                  }}>
                    <p className="serif" style={{
                      fontSize: '1.25rem',
                      color: '#0a1628',
                      marginBottom: '1.25rem',
                      fontWeight: 500
                    }}>
                      Bagaimana kesan Anda?
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      {[
                        { emoji: '😍', value: 'love', label: 'Sangat suka' },
                        { emoji: '😐', value: 'neutral', label: 'Biasa saja' },
                        { emoji: '😕', value: 'confused', label: 'Kurang sesuai' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setFeedback(option.value)}
                          style={{
                            flex: 1,
                            padding: '1rem 0.75rem',
                            border: `1px solid ${feedback === option.value ? '#cc2936' : '#d1d5db'}`,
                            borderRadius: 4,
                            background: feedback === option.value ? 'rgba(204, 41, 54, 0.04)' : '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontFamily: "'DM Sans', sans-serif"
                          }}
                        >
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{option.emoji}</div>
                          <div style={{ fontSize: '0.75rem', color: '#2a3f5f', fontWeight: 500 }}>{option.label}</div>
                        </button>
                      ))}
                    </div>

                    {feedback && (
                      <div className="animate-fade-in">
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Ada masukan tambahan? (opsional)"
                          style={{
                            width: '100%',
                            padding: '1rem 1.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: 4,
                            fontSize: '0.9375rem',
                            fontFamily: "'DM Sans', sans-serif",
                            color: '#0a1628',
                            resize: 'vertical',
                            minHeight: 80,
                            marginBottom: '1rem',
                            outline: 'none'
                          }}
                        />

                        <button
                          onClick={handleFeedbackSubmit}
                          style={{
                            background: '#cc2936',
                            color: '#fff',
                            padding: '0.875rem 1.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif"
                          }}
                        >
                          Kirim Feedback
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    borderTop: '1px solid #e5e5e5',
                    paddingTop: '2rem',
                    marginBottom: '2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <Check size={20} color="#059669" />
                    <span style={{ fontSize: '0.9375rem', color: '#2a3f5f' }}>
                      Terima kasih atas feedback Anda
                    </span>
                  </div>
                )}

                {/* CTA - Matching hero style */}
                <div style={{
                  background: '#0a1628',
                  padding: '2.5rem 2rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(ellipse 60% 60% at 20% 80%, rgba(204, 41, 54, 0.15) 0%, transparent 50%)',
                    pointerEvents: 'none'
                  }} />
                  <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <p style={{
                      fontSize: '1rem',
                      color: '#059669',
                      lineHeight: 1.6
                    }}>
                      ✓ Trial 7 hari Anda sudah aktif. Brief akan dikirim ke {state.email} setiap hari.
                    </p>
                  </div>
                </div>
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
