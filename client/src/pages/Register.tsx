import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Link } from 'wouter';

interface ProfileData {
  name?: string;
  role?: string;
  organization?: string;
  industry?: string;
  readingSources?: string[];
  primaryTopics?: string[];
  specificEntities?: string[];
  currentDecisions?: string;
  councilSystemPrompt?: string;
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const saved = sessionStorage.getItem('loperProfile');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setProfile(p);
        if (p.name) setName(p.name);
      } catch (e) {
        console.error('Failed to parse profile:', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, profile })
      });

      const data = await res.json();
      
      if (data.success) {
        sessionStorage.removeItem('loperProfile');
        if (data.userId) {
          localStorage.setItem('loper_user_id', data.userId);
        }
        if (data.token) {
          localStorage.setItem('loper_session_token', data.token);
        }
        setLocation('/dashboard');
      } else {
        setError(data.error || 'Gagal membuat akun. Coba lagi.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan. Coba lagi.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">K</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="heading-register">Buat Akun</h1>
          <p className="text-slate-500 mt-2">Untuk menerima brief personal Anda</p>
        </div>

        {profile && profile.primaryTopics && profile.primaryTopics.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-6 border border-slate-200">
            <p className="text-sm text-slate-500 mb-2">Brief Anda akan fokus pada:</p>
            <div className="flex flex-wrap gap-2">
              {profile.primaryTopics.slice(0, 4).map((t: string, i: number) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded" data-testid={`tag-topic-${i}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" data-testid="text-error">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
                data-testid="input-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
                data-testid="input-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
                minLength={6}
                data-testid="input-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 disabled:bg-slate-300"
            data-testid="button-submit"
          >
            {loading ? 'Membuat akun...' : 'Buat Akun'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Sudah punya akun? <Link href="/login" className="text-slate-900 font-medium" data-testid="link-login">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
