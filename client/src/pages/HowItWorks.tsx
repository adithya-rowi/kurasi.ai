import { 
  Sparkles, 
  BookOpen, 
  Settings, 
  Workflow,
  LogIn,
  Scale,
  FileText,
  ArrowDown,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'wouter';

function AICard({ 
  name, 
  provider, 
  strength, 
  color, 
  badge 
}: { 
  name: string; 
  provider: string; 
  strength: string; 
  color: string;
  badge?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3 border border-slate-200 relative">
      {badge && (
        <span className={`absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded ${
          badge === 'JUDGE' ? 'bg-amber-500 text-white' :
          badge === 'LIVE' ? 'bg-cyan-500 text-white' :
          badge === 'X' ? 'bg-orange-500 text-white' : 'bg-slate-500 text-white'
        }`}>
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="font-medium text-sm text-slate-900">{name}</span>
      </div>
      <div className="text-xs text-slate-500">{strength}</div>
    </div>
  );
}

export default function HowItWorks() {
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
        <div className="max-w-3xl mx-auto px-6 py-12">
          
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-3" data-testid="page-title">
              Bagaimana Kurasi Bekerja
            </h1>
            <p className="text-slate-500">
              6 AI model bekerja paralel, 1 hakim menyeleksi.
            </p>
          </div>

          <div className="space-y-6">
            
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Profil Anda</h3>
                  <p className="text-sm text-slate-500">Dari percakapan onboarding</p>
                </div>
              </div>
              <div className="ml-14 text-sm text-slate-600">
                Peran, topik, sumber yang dipercaya, keputusan yang sedang dihadapi
                → menjadi <strong>system prompt unik</strong> untuk Anda.
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-6 h-6 text-slate-300" />
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-slate-900">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">6 AI Mencari Paralel</h3>
                  <p className="text-sm text-slate-500">Setiap model punya kekuatan berbeda</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 ml-14">
                <AICard 
                  name="GPT-4o" 
                  provider="OpenAI" 
                  strength="Reasoning" 
                  color="bg-green-500"
                />
                <AICard 
                  name="Gemini Pro" 
                  provider="Google" 
                  strength="1M+ context" 
                  color="bg-blue-500"
                />
                <AICard 
                  name="DeepSeek V3" 
                  provider="DeepSeek" 
                  strength="Asia focus" 
                  color="bg-purple-500"
                />
                <AICard 
                  name="Perplexity" 
                  provider="Real-time" 
                  strength="Live web search" 
                  color="bg-cyan-500"
                  badge="LIVE"
                />
                <AICard 
                  name="Grok" 
                  provider="xAI" 
                  strength="X/Twitter data" 
                  color="bg-orange-500"
                  badge="X"
                />
                <AICard 
                  name="Claude Opus" 
                  provider="Anthropic" 
                  strength="Judgment" 
                  color="bg-amber-500"
                  badge="JUDGE"
                />
              </div>
              
              <div className="ml-14 mt-4 text-sm text-slate-500">
                Setiap AI mencari ~5 berita → Total ~30 kandidat artikel
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-6 h-6 text-slate-300" />
            </div>

            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Claude Opus Menilai</h3>
                  <p className="text-sm text-slate-500">Hakim akhir yang memfilter</p>
                </div>
              </div>
              
              <div className="ml-14 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>Deduplikasi berita yang sama</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>Verifikasi sumber & URL</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>Cross-check: berapa AI yang setuju?</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>Kategorikan: 🔴 Kritis, 🟡 Penting, 🟢 Latar</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>Tulis "Mengapa ini penting untuk ANDA"</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-6 h-6 text-slate-300" />
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h3 className="font-semibold">Brief Personal Anda</h3>
                  <p className="text-sm text-slate-400">8-12 berita tersaring</p>
                </div>
              </div>
              
              <div className="ml-14 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-red-400">1-3</div>
                  <div className="text-xs text-slate-400">🔴 Kritis</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">3-5</div>
                  <div className="text-xs text-slate-400">🟡 Penting</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">2-4</div>
                  <div className="text-xs text-slate-400">🟢 Latar</div>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Transparansi & Trust</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <p>• Setiap berita menunjukkan <strong>sumber asli + URL</strong></p>
              <p>• Terlihat <strong>AI mana yang menemukan</strong> berita tersebut</p>
              <p>• <strong>Skor verifikasi</strong> berdasarkan kredibilitas sumber</p>
              <p>• Berita dari <strong>multiple AI</strong> = lebih terpercaya</p>
              <p>• Kami <strong>tidak mengubah fakta</strong> dari sumber asli</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800"
              data-testid="cta-start"
            >
              <Sparkles className="w-4 h-4" />
              Mulai Sekarang
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
