import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { councilApi, userApi, DailyBriefContent, BriefArticle } from "@/lib/api";
import { session } from "@/lib/session";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Archive, 
  Bookmark, 
  Settings, 
  Menu,
  ExternalLink,
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [_, setLocation] = useLocation();
  const userId = session.getUserId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      setLocation("/");
    }
  }, [userId, setLocation]);

  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userId ? userApi.getById(userId) : null,
    enabled: !!userId,
  });

  const { data: latestBrief, isLoading: briefLoading } = useQuery({
    queryKey: ['brief', userId],
    queryFn: () => userId ? councilApi.getLatestBrief(userId) : null,
    enabled: !!userId,
    retry: false,
  });

  const generateBriefMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("No user ID");
      return councilApi.runCouncil(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brief', userId] });
      toast.success("Brief Anda sudah siap!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal membuat brief");
    },
  });

  const briefContent = latestBrief?.content as DailyBriefContent | undefined;
  const hasBrief = !!briefContent;

  if (!userId) return null;

  const today = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    day: 'numeric',
    month: 'long', 
    year: 'numeric', 
  });

  const greeting = () => {
    const hour = new Date().getHours();
    const name = user?.fullName?.split(' ')[0] || '';
    if (hour >= 5 && hour < 11) return `Selamat pagi, ${name}!`;
    if (hour >= 11 && hour < 15) return `Selamat siang, ${name}!`;
    if (hour >= 15 && hour < 18) return `Selamat sore, ${name}!`;
    return `Selamat malam, ${name}!`;
  };

  const handleLogout = () => {
    session.clear();
    setLocation("/");
  };

  const allSources = hasBrief ? [
    ...(briefContent.critical || []),
    ...(briefContent.important || []),
    ...(briefContent.background || [])
  ] : [];

  return (
    <div className="flex h-screen bg-white">
      
      <aside className={cn(
        "bg-slate-50 border-r border-slate-200 flex flex-col transition-all",
        sidebarOpen ? "w-60" : "w-16"
      )}>
        <div className="h-14 flex items-center px-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            {sidebarOpen && <span className="font-semibold text-slate-900">Loper</span>}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<LayoutDashboard size={18} />} label="Brief Hari Ini" active isOpen={sidebarOpen} />
          <NavItem icon={<Archive size={18} />} label="Arsip" isOpen={sidebarOpen} href="/archive" />
          <NavItem icon={<Bookmark size={18} />} label="Tersimpan" isOpen={sidebarOpen} href="/saved" />
          <NavItem icon={<Settings size={18} />} label="Pengaturan" isOpen={sidebarOpen} href="/pricing" />
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-lg",
            !sidebarOpen && "justify-center"
          )}>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
              {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.fullName}</p>
                <button 
                  onClick={handleLogout}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  data-testid="button-logout"
                >
                  <LogOut size={10} /> Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        
        <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-700" data-testid="button-toggle-sidebar">
              <Menu size={20} />
            </button>
            <span className="text-sm text-slate-500">{today}</span>
          </div>
          {hasBrief && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateBriefMutation.mutate()}
              disabled={generateBriefMutation.isPending}
              className="gap-2 text-slate-600"
              data-testid="button-refresh-brief"
            >
              {generateBriefMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Refresh Brief
            </Button>
          )}
        </header>

        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-6 py-10">
            
            <div className="mb-10">
              <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2" data-testid="text-greeting">
                {briefContent?.greeting || greeting()}
              </h1>
              {briefContent?.executiveSummary && (
                <p className="text-lg text-slate-600 leading-relaxed" data-testid="text-summary">
                  {briefContent.executiveSummary}
                </p>
              )}
            </div>

            {briefLoading && (
              <div className="text-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">Memuat brief Anda...</p>
              </div>
            )}

            {!hasBrief && !briefLoading && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  6 AI Siap Bekerja untuk Anda
                </h2>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  GPT-5.2, Claude Opus 4.5, Gemini 3, DeepSeek, Perplexity, dan Grok akan mencari berita yang relevan untuk Anda.
                </p>
                <Button 
                  onClick={() => generateBriefMutation.mutate()}
                  disabled={generateBriefMutation.isPending}
                  size="lg"
                  className="bg-slate-900 hover:bg-slate-800 gap-2"
                  data-testid="button-generate-brief"
                >
                  {generateBriefMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      6 AI Sedang Bekerja...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Buat Brief Saya
                    </>
                  )}
                </Button>
                {generateBriefMutation.isPending && (
                  <p className="text-xs text-slate-400 mt-4">
                    Proses ini memakan waktu 30-60 detik.
                  </p>
                )}
              </div>
            )}

            {hasBrief && (
              <div className="space-y-10">
                
                {briefContent.critical && briefContent.critical.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-red-600">
                        Kritis
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {briefContent.critical.map((article, idx) => (
                        <ArticleCard key={idx} article={article} priority="critical" />
                      ))}
                    </div>
                  </section>
                )}

                {briefContent.important && briefContent.important.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600">
                        Penting
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {briefContent.important.map((article, idx) => (
                        <ArticleCard key={idx} article={article} priority="important" />
                      ))}
                    </div>
                  </section>
                )}

                {briefContent.background && briefContent.background.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Untuk Dipantau
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {briefContent.background.map((article, idx) => (
                        <ArticleCard key={idx} article={article} priority="background" />
                      ))}
                    </div>
                  </section>
                )}

                {allSources.length > 0 && (
                  <section className="pt-6 border-t border-slate-200">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                      Referensi
                    </h2>
                    <div className="space-y-2">
                      {allSources.map((article, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400">{idx + 1}.</span>
                          <span className="text-slate-600">{article.source}</span>
                          <span className="text-slate-300">—</span>
                          <span className="text-slate-500 truncate flex-1">{article.title}</span>
                          {article.url && article.url !== "perlu verifikasi" && (
                            <a 
                              href={article.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {briefContent.modelsUsed && (
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-400">
                      Dikurasi oleh {briefContent.modelsUsed.join(", ")}
                    </p>
                    {briefContent.councilAgreement && (
                      <p className="text-xs text-slate-500 mt-1">{briefContent.councilAgreement}</p>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

function NavItem({ 
  icon, 
  label, 
  active, 
  isOpen, 
  href 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  isOpen: boolean;
  href?: string;
}) {
  const content = (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
      active 
        ? "bg-slate-200 text-slate-900" 
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    )}>
      {icon}
      {isOpen && <span className="text-sm font-medium">{label}</span>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ArticleCard({ 
  article, 
  priority 
}: { 
  article: BriefArticle; 
  priority: "critical" | "important" | "background";
}) {
  const [expanded, setExpanded] = useState(priority === "critical");

  const borderColor = {
    critical: "border-l-red-500",
    important: "border-l-amber-500",
    background: "border-l-slate-300"
  }[priority];

  return (
    <div className={cn(
      "bg-white border border-slate-200 rounded-xl p-5 border-l-4",
      borderColor
    )}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="font-medium text-slate-500">{article.source}</span>
            {article.publishedDate && (
              <>
                <span>•</span>
                <span>{article.publishedDate}</span>
              </>
            )}
            {article.isPaywalled && (
              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">
                Berbayar
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 leading-snug">
            {article.title}
          </h3>
        </div>
        {article.url && article.url !== "perlu verifikasi" && (
          <a 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>

      <p className="text-slate-600 text-sm leading-relaxed mb-3">
        {article.summary}
      </p>

      {article.whyItMatters && (
        <div 
          className="cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span className="font-medium">Relevansi untuk Anda</span>
          </div>
          {expanded && (
            <p className="text-sm text-slate-600 mt-2 pl-5 border-l-2 border-slate-200">
              {article.whyItMatters}
            </p>
          )}
        </div>
      )}

      {expanded && article.foundByPerspectives && article.foundByPerspectives.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Ditemukan oleh: {article.foundByPerspectives.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
