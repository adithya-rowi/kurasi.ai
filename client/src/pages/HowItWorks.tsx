import { 
  Sparkles, 
  BookOpen, 
  Settings, 
  Workflow,
  LogIn,
  ArrowRight
} from 'lucide-react';
import { Link } from 'wouter';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-white flex">
      
      <aside className="hidden lg:flex w-60 bg-slate-50 border-r border-slate-200 flex-col">
        <div className="p-5 flex-1">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="text-xl font-semibold text-slate-900">Loper</span>
          </div>

          <nav className="space-y-1">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm" data-testid="nav-home">
              <Sparkles className="w-4 h-4" />
              Mulai
            </Link>
            <Link href="/how-it-works" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-200/70 text-slate-900 font-medium text-sm" data-testid="nav-how-it-works">
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

      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-16">
          
          <h1 className="text-2xl font-semibold text-slate-900 mb-12 text-center" data-testid="page-title">
            Cara Kerja
          </h1>

          <div className="relative">
            
            <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-200" />
            
            <div className="relative flex gap-6 mb-12">
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 z-10">
                1
              </div>
              <div className="pt-2">
                <h3 className="font-medium text-slate-900 mb-1">Profil Anda</h3>
                <p className="text-sm text-slate-500">
                  Dari percakapan, kami memahami peran, topik, dan keputusan Anda 
                  → menjadi instruksi unik untuk AI.
                </p>
              </div>
            </div>

            <div className="relative flex gap-6 mb-12">
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 z-10">
                2
              </div>
              <div className="pt-2">
                <h3 className="font-medium text-slate-900 mb-1">6 AI Mencari</h3>
                <p className="text-sm text-slate-500 mb-3">
                  Setiap model mencari ~5 berita secara paralel.
                </p>
                
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div>GPT-5.2 <span className="text-slate-300">— reasoning</span></div>
                  <div>Gemini 3 Pro <span className="text-slate-300">— 1M context</span></div>
                  <div>DeepSeek V3 <span className="text-slate-300">— Asia focus</span></div>
                  <div>Perplexity <span className="text-slate-300">— live web</span></div>
                  <div>Grok 4.1 <span className="text-slate-300">— X/Twitter</span></div>
                  <div>Claude Opus 4.5 <span className="text-slate-300">— judge</span></div>
                </div>
              </div>
            </div>

            <div className="relative flex gap-6 mb-12">
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 z-10">
                3
              </div>
              <div className="pt-2">
                <h3 className="font-medium text-slate-900 mb-1">Claude Menilai</h3>
                <p className="text-sm text-slate-500">
                  Deduplikasi, verifikasi sumber, cek konsensus antar AI, 
                  kategorikan prioritas, tulis relevansi untuk Anda.
                </p>
              </div>
            </div>

            <div className="relative flex gap-6">
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0 z-10">
                4
              </div>
              <div className="pt-2">
                <h3 className="font-medium text-slate-900 mb-1">Brief Anda</h3>
                <p className="text-sm text-slate-500">
                  8-12 berita tersaring. Setiap berita menunjukkan sumber, 
                  URL asli, dan AI mana yang menemukannya.
                </p>
              </div>
            </div>

          </div>

          <div className="mt-16 text-center">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-sm text-slate-900 hover:text-slate-600"
              data-testid="cta-start"
            >
              Mulai sekarang
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
