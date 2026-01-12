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
  isUrlVerified?: boolean;
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
  institusiInsights?: EspressoStory[];
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

const REGULATORS = [
  { id: 'ojk', label: 'OJK' },
  { id: 'bi', label: 'BI' },
  { id: 'lps', label: 'LPS' },
  { id: 'kemenkeu', label: 'Kemenkeu' },
  { id: 'bps', label: 'BPS' }
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
    institutions: '',
    regulators: [] as string[],
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

  const toggleRegulator = (regulator: string) => {
    setState(prev => ({
      ...prev,
      regulators: prev.regulators.includes(regulator)
        ? prev.regulators.filter(r => r !== regulator)
        : [...prev.regulators, regulator]
    }));
  };

  // Auto-derive topics from institusi name
  const deriveTopics = (institusi: string): string[] => {
    const lowerInstitusi = institusi.toLowerCase();
    if (lowerInstitusi.includes('bank')) {
      return ['Perbankan & Keuangan'];
    }
    return ['Ekonomi Makro'];
  };

  // Validation: institusi is required
  const canProceedStep1 = state.institutions.trim().length > 0;
  // Step 2: email required
  const canSubmit = state.email.includes('@');

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Auto-derive topics from institusi name
      const derivedTopics = deriveTopics(state.institutions);

      // Build institutions string including selected regulators
      const allInstitutions = [
        state.institutions,
        ...state.regulators.map(r => REGULATORS.find(reg => reg.id === r)?.label || r)
      ].filter(Boolean).join(', ');

      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'Komisaris / Penasihat Senior',
          decisionContext: 'pengawasan dan governance',
          sources: [],
          customSources: '',
          topics: derivedTopics,
          institutions: allInstitutions,
          voices: '',
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
        setCurrentStep(2); // Go to Step 2: Show brief
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

  const progressWidth = brief ? 100 : loading ? 50 : 0;

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

            {/* Step 1: Simplified - Institusi, Regulators, Email */}
            {currentStep === 1 && (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0a1628' }}>Ceritakan institusi Anda</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                  AI akan mempersonalisasi brief untuk Komisaris & Penasihat Senior.
                </p>

                {/* Institusi Input */}
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ fontSize: '0.875rem', color: '#2a3f5f', marginBottom: '0.5rem', display: 'block', fontWeight: 500 }}>
                    Nama Institusi Anda
                  </label>
                  <input
                    type="text"
                    value={state.institutions}
                    onChange={(e) => setState(prev => ({ ...prev, institutions: e.target.value }))}
                    placeholder="Contoh: Bank Mandiri, Telkom Indonesia, Astra International"
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

                {/* Regulator Checkboxes */}
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ fontSize: '0.875rem', color: '#2a3f5f', marginBottom: '0.75rem', display: 'block', fontWeight: 500 }}>
                    Regulator yang ingin dipantau
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {REGULATORS.map(regulator => (
                      <label
                        key={regulator.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem 1rem',
                          border: `1px solid ${state.regulators.includes(regulator.id) ? '#cc2936' : '#d1d5db'}`,
                          borderRadius: 4,
                          cursor: 'pointer',
                          background: state.regulators.includes(regulator.id) ? 'rgba(204, 41, 54, 0.04)' : '#fff',
                          transition: 'all 0.2s ease'
                        }}
                        data-testid={`checkbox-${regulator.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={state.regulators.includes(regulator.id)}
                          onChange={() => toggleRegulator(regulator.id)}
                          style={{ accentColor: '#cc2936' }}
                        />
                        <span style={{ fontSize: '0.9375rem', color: '#0a1628', fontWeight: 500 }}>
                          {regulator.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Email Input */}
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ fontSize: '0.875rem', color: '#2a3f5f', marginBottom: '0.5rem', display: 'block', fontWeight: 500 }}>
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
                    onClick={handleSubmit}
                    disabled={!canProceedStep1 || !canSubmit || loading}
                    style={{
                      background: canProceedStep1 && canSubmit && !loading ? '#cc2936' : '#d1d5db',
                      color: '#fff',
                      padding: '1rem 2rem',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: canProceedStep1 && canSubmit && !loading ? 'pointer' : 'not-allowed',
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
                  {(!canProceedStep1 || !canSubmit) && !loading && (
                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      {!state.institutions.trim() ? 'Masukkan nama institusi' : 'Masukkan email yang valid'}
                    </span>
                  )}
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

            {/* Step 2: Brief Preview + Feedback */}
            {currentStep === 2 && brief && (
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
                        marginBottom: '0.5rem'
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

                      {/* Date & Source (above headline) */}
                      {[story.recencyLabel, story.publishedDate, story.source].filter(Boolean).length > 0 && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                          marginBottom: '0.5rem'
                        }}>
                          {[story.recencyLabel, story.publishedDate, story.source].filter(Boolean).join(' · ')}
                        </div>
                      )}

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

                      {/* Link */}
                      {story.url && story.isUrlVerified && (
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
                    </article>
                  ))}
                </div>

                {/* Institusi Insights Section */}
                {brief.institusiInsights && brief.institusiInsights.length > 0 && (
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
                      🏢 Update Institusi
                    </h2>
                    {brief.institusiInsights.map((story, index) => (
                      <div key={`institusi-${index}`} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                        {[story.recencyLabel, story.publishedDate, story.source].filter(Boolean).length > 0 && (
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                            {[story.recencyLabel, story.publishedDate, story.source].filter(Boolean).join(' · ')}
                          </p>
                        )}
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
                        {story.url && story.isUrlVerified && (
                          <a href={story.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#cc2936', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            Baca selengkapnya <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ))}
                  </>
                )}

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
                        {[story.recencyLabel, story.publishedDate, story.source].filter(Boolean).length > 0 && (
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                            {[story.recencyLabel, story.publishedDate, story.source].filter(Boolean).join(' · ')}
                          </p>
                        )}
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
                        {story.url && story.isUrlVerified && (
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
