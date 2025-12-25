import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Sparkles, 
  BookOpen, 
  Settings, 
  Workflow,
  LogIn,
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
    <div className="min-h-screen bg-white flex">
      
      <aside className="hidden lg:flex w-60 bg-slate-50 border-r border-slate-200 flex-col">
        <div className="p-5 flex-1">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">K</span>
            </div>
            <span className="text-xl font-semibold text-slate-900">Kurasi</span>
          </div>

          <nav className="space-y-1">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-200/70 text-slate-900 font-medium text-sm" data-testid="nav-home">
              <Sparkles className="w-4 h-4" />
              Mulai
            </Link>
            <Link href="/how-it-works" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm" data-testid="nav-how-it-works">
              <Workflow className="w-4 h-4" />
              Cara Kerja
            </Link>
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm" data-testid="nav-dashboard">
              <BookOpen className="w-4 h-4" />
              Brief Saya
            </Link>
            <Link href="/pricing" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm" data-testid="nav-settings">
              <Settings className="w-4 h-4" />
              Pengaturan
            </Link>
          </nav>
        </div>

        <div className="p-5 border-t border-slate-200">
          <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm" data-testid="nav-login">
            <LogIn className="w-4 h-4" />
            Masuk
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2" data-testid="page-title">
              Brief Personal Anda
            </h1>
            <p className="text-slate-500">
              6 AI bekerja untuk Anda. Setiap pagi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Siapa Anda?
              </label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => setForm({...form, role: e.target.value})}
                placeholder="CFO di Bank Mandiri, fokus transformasi digital"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 placeholder-slate-400"
                required
                data-testid="input-role"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Topik yang harus dipantau
              </label>
              <input
                type="text"
                value={form.topics}
                onChange={(e) => setForm({...form, topics: e.target.value})}
                placeholder="AI, fintech, regulasi OJK, cybersecurity"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 placeholder-slate-400"
                required
                data-testid="input-topics"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Orang/perusahaan yang diikuti
              </label>
              <input
                type="text"
                value={form.entities}
                onChange={(e) => setForm({...form, entities: e.target.value})}
                placeholder="Paul Graham, OpenAI, Gojek, Bank Jago"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 placeholder-slate-400"
                data-testid="input-entities"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Sumber berita yang dipercaya
              </label>
              <input
                type="text"
                value={form.sources}
                onChange={(e) => setForm({...form, sources: e.target.value})}
                placeholder="Twitter/X, TechCrunch, Kontan, Bloomberg"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 placeholder-slate-400"
                data-testid="input-sources"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !form.role || !form.topics}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="button-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyiapkan...
                </>
              ) : (
                <>
                  Buat Brief Saya
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Brief pertama akan dikirim ke email Anda besok pagi.
          </p>

        </div>
      </main>
    </div>
  );
}
