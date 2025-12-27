import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Link } from 'wouter';

export default function Landing() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    role: '',
    topics: '',
    format: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/onboarding/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role,
          topics: form.topics,
          entities: '',
          sources: form.format
        })
      });

      const data = await res.json();
      
      if (data.profile) {
        sessionStorage.setItem('kurasiProfile', JSON.stringify(data.profile));
        setLocation('/register');
      }
    } catch (err) {
      console.error(err);
    }
    
    setLoading(false);
  };

  return (
    <div 
      className="min-h-screen bg-white flex items-center justify-center px-6 py-12" 
      style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      
      <div className="w-full max-w-[650px]">
        
        <div className="text-center mb-14">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-2xl mb-8">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 
            className="text-4xl md:text-5xl font-extrabold mb-5" 
            style={{ 
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.035em',
              color: '#0a0a0a',
              lineHeight: 1.1
            }}
            data-testid="page-title"
          >
            Satu Langganan.<br />Wawasan Tanpa Batas.
          </h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
            Tak perlu pusing dengan puluhan langganan media. AI kami membaca ribuan sumber global & lokal, lalu menuliskan <strong className="text-slate-700">ringkasan intelijen</strong> yang relevan untuk Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2.5">
              Profil & Konteks Profesional
            </label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => setForm({...form, role: e.target.value})}
              placeholder="Cth: Komisaris Bank, Fokus Emerging Market..."
              className="w-full px-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-base transition-all duration-200 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              required
              data-testid="input-role"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2.5">
              Topik & Wilayah Prioritas
            </label>
            <input
              type="text"
              value={form.topics}
              onChange={(e) => setForm({...form, topics: e.target.value})}
              placeholder="Cth: Ekonomi Indonesia, Hilirisasi, The Fed..."
              className="w-full px-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-base transition-all duration-200 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              required
              data-testid="input-topics"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2.5">
              Kedalaman & Format
            </label>
            <input
              type="text"
              value={form.format}
              onChange={(e) => setForm({...form, format: e.target.value})}
              placeholder="Cth: Ringkasan 5 poin (Bullet points) atau Analisis Mendalam..."
              className="w-full px-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-base transition-all duration-200 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              data-testid="input-format"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !form.role || !form.topics}
              className="w-full py-5 rounded-2xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
              data-testid="button-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyiapkan Analisis...
                </>
              ) : (
                <>
                  Mulai Analisis Personal Saya
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </form>

        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-slate-400">
            Privasi dijaga. Ringkasan hasil sintesis AI orisinal.
          </p>
          <p className="text-sm text-slate-400">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-slate-600 font-medium hover:text-slate-900 underline underline-offset-2" data-testid="link-login">
              Masuk
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
