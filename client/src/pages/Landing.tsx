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
    entities: '',
    sources: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/onboarding/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
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
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      <div className="w-full max-w-[560px]">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-2xl mb-6">
            <span className="text-white font-bold text-xl">K</span>
          </div>
          <h1 
            className="text-4xl font-extrabold mb-3" 
            style={{ 
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              letterSpacing: '-0.03em',
              color: '#0a0a0a'
            }}
            data-testid="page-title"
          >
            Brief Personal Anda
          </h1>
          <p className="text-base text-slate-400">
            6 AI bekerja untuk Anda. Setiap pagi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Siapa Anda?
            </label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => setForm({...form, role: e.target.value})}
              placeholder="CFO di Bank Mandiri, fokus transformasi digital"
              className="w-full px-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-base transition-all duration-200 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              required
              data-testid="input-role"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Topik yang harus dipantau
            </label>
            <input
              type="text"
              value={form.topics}
              onChange={(e) => setForm({...form, topics: e.target.value})}
              placeholder="AI, fintech, regulasi OJK, cybersecurity"
              className="w-full px-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-base transition-all duration-200 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              required
              data-testid="input-topics"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Orang/perusahaan yang diikuti
            </label>
            <input
              type="text"
              value={form.entities}
              onChange={(e) => setForm({...form, entities: e.target.value})}
              placeholder="Paul Graham, OpenAI, Gojek, Bank Jago"
              className="w-full px-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-base transition-all duration-200 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              data-testid="input-entities"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Sumber berita yang dipercaya
            </label>
            <input
              type="text"
              value={form.sources}
              onChange={(e) => setForm({...form, sources: e.target.value})}
              placeholder="Twitter/X, TechCrunch, Kontan, Bloomberg"
              className="w-full px-5 py-5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-base transition-all duration-200 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              data-testid="input-sources"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !form.role || !form.topics}
              className="w-full py-5 rounded-2xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-colors duration-200"
              style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
              data-testid="button-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyiapkan...
                </>
              ) : (
                <>
                  Buat Brief Saya
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </form>

        <div className="mt-10 text-center space-y-3">
          <p className="text-sm text-slate-400">
            Brief pertama akan dikirim ke email Anda besok pagi.
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
