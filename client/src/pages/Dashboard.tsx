import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Article } from "@shared/schema";
import { articlesApi, userApi, councilApi, subscriptionApi, DailyBriefContent, BriefArticle } from "@/lib/api";
import { session } from "@/lib/session";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BriefCard } from "@/components/Dashboard/BriefCard";
import { 
  LayoutDashboard, 
  Archive, 
  Bookmark, 
  Settings, 
  Search, 
  Bell, 
  Menu,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileText,
  Mail,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [_, setLocation] = useLocation();
  const userId = session.getUserId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      setLocation("/onboarding");
    }
  }, [userId, setLocation]);

  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userId ? userApi.getById(userId) : null,
    enabled: !!userId,
  });

  const { data: latestBrief, isLoading: briefLoading, error: briefError } = useQuery({
    queryKey: ['brief', userId],
    queryFn: () => userId ? councilApi.getLatestBrief(userId) : null,
    enabled: !!userId,
    retry: false,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => userId ? subscriptionApi.getStatus(userId) : null,
    enabled: !!userId,
  });

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesApi.getAll(20),
  });

  const generateBriefMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("No user ID");
      return councilApi.runCouncil(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brief', userId] });
      toast.success("Brief intelijen Anda sudah siap!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal membuat brief");
    },
  });

  const briefContent = latestBrief?.content as DailyBriefContent | undefined;
  const hasBrief = !!briefContent;

  const criticalArticles = articles.filter(a => a.category === "Critical");
  const importantArticles = articles.filter(a => a.category === "Important");
  const backgroundArticles = articles.filter(a => a.category === "Background");

  const handleSaveArticle = (item: { title: string; source: string }) => {
    if (userId) {
      councilApi.sendFeedback(userId, item.title, item.source, "save");
      toast.success("Artikel tersimpan!");
    }
  };

  const handleNotRelevant = (item: { title: string; source: string }) => {
    if (userId) {
      councilApi.sendFeedback(userId, item.title, item.source, "not_relevant");
      toast.info("Feedback diterima - brief akan lebih baik kedepannya");
    }
  };

  if (!userId) {
    return null;
  }

  const today = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const getIndonesianGreeting = (name: string): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      return `Selamat pagi, ${name}!`;
    } else if (hour >= 11 && hour < 15) {
      return `Selamat siang, ${name}!`;
    } else if (hour >= 15 && hour < 18) {
      return `Selamat sore, ${name}!`;
    } else {
      return `Selamat malam, ${name}!`;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside 
        className={cn(
          "bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col z-20",
          sidebarOpen ? "w-64" : "w-[70px]"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="min-w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-serif font-bold text-xl">
                C
            </div>
            {sidebarOpen && <span className="font-serif font-bold text-lg whitespace-nowrap">CurateAI</span>}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-2">
            <NavItem icon={<LayoutDashboard size={20} />} label="Brief Hari Ini" isActive isOpen={sidebarOpen} />
            <NavItem icon={<Archive size={20} />} label="Arsip" isOpen={sidebarOpen} href="/archive" />
            <NavItem icon={<Bookmark size={20} />} label="Tersimpan" isOpen={sidebarOpen} href="/saved" />
            <NavItem icon={<Settings size={20} />} label="Pengaturan" isOpen={sidebarOpen} />
        </nav>

        <div className="p-3 mt-auto border-t border-sidebar-border">
            <div className={cn("flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer", !sidebarOpen && "justify-center")}>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                    {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                </div>
                {sidebarOpen && user && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.organization}</p>
                    </div>
                )}
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="button-toggle-sidebar">
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="hidden md:block">
                    <p className="text-sm text-muted-foreground">{today}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative hidden md:block w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Cari berita..." 
                        className="w-full h-9 rounded-full bg-secondary/50 border-none pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="input-search"
                    />
                </div>
                <Button variant="ghost" size="icon" data-testid="button-notifications">
                    <Bell className="h-5 w-5" />
                </Button>
            </div>
        </header>

        <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10 pb-20">
                
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold" data-testid="text-greeting">
                      {briefContent?.greeting || getIndonesianGreeting(user?.fullName?.split(' ')[0] || 'Eksekutif')}
                    </h1>
                    <p className="text-lg text-muted-foreground" data-testid="text-summary">
                      {briefContent?.executiveSummary || (briefLoading ? "Memuat brief Anda..." : "Buat brief intelijen personal Anda untuk memulai.")}
                    </p>
                </div>

                {subscription && !subscription.isPremium && (
                  <Link href="/pricing">
                    <div 
                      className="bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 border border-primary/20 rounded-xl p-4 cursor-pointer hover:border-primary/40 transition-all group"
                      data-testid="banner-premium-upsell"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold">Terima brief langsung di email Anda</h3>
                              <Crown className="h-4 w-4 text-amber-500" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Upgrade ke Premium Rp 79.000/bulan dan jangan lewatkan berita penting
                            </p>
                          </div>
                        </div>
                        <Button size="sm" className="group-hover:scale-105 transition-transform" data-testid="button-upgrade-premium">
                          Berlangganan
                        </Button>
                      </div>
                    </div>
                  </Link>
                )}

                {!hasBrief && !briefLoading && (
                  <div className="bg-gradient-to-br from-primary/5 to-amber-500/5 border border-primary/20 rounded-xl p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mx-auto">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex justify-center mb-4">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">G</div>
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">G</div>
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">D</div>
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">X</div>
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">C</div>
                      </div>
                    </div>
                    <h3 className="font-serif font-bold text-xl">5 AI Siap Bekerja untuk Anda</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Klik "Buat Brief" untuk memulai. 5 model AI akan mencari dan menyaring berita yang paling relevan untuk Anda secara bersamaan.
                    </p>
                    <Button 
                      onClick={() => generateBriefMutation.mutate()}
                      disabled={generateBriefMutation.isPending}
                      className="gap-2"
                      size="lg"
                      data-testid="button-generate-brief"
                    >
                      {generateBriefMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          AI Sedang Bekerja...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Buat Brief Saya
                        </>
                      )}
                    </Button>
                    {generateBriefMutation.isPending && (
                      <p className="text-xs text-muted-foreground">Proses ini memakan waktu 30-60 detik karena 5 AI menganalisis berita untuk Anda.</p>
                    )}
                  </div>
                )}

                {hasBrief && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Dibuat {new Date(latestBrief!.generatedAt).toLocaleTimeString('id-ID')}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateBriefMutation.mutate()}
                        disabled={generateBriefMutation.isPending}
                        className="gap-2"
                        data-testid="button-refresh-brief"
                      >
                        {generateBriefMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Refresh
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-destructive">
                          {briefContent.critical?.length || 0}
                        </div>
                        <div className="text-sm text-destructive/80">Kritis</div>
                      </div>
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-amber-600">
                          {briefContent.important?.length || 0}
                        </div>
                        <div className="text-sm text-amber-600/80">Penting</div>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-emerald-600">
                          {briefContent.background?.length || 0}
                        </div>
                        <div className="text-sm text-emerald-600/80">Latar</div>
                      </div>
                    </div>

                    {briefContent.critical && briefContent.critical.length > 0 && (
                      <section className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-destructive mb-4 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                          Perlu Perhatian Anda
                        </h2>
                        {briefContent.critical.map((article, idx) => (
                          <BriefCard
                            key={idx}
                            item={article}
                            priority="critical"
                            onSave={handleSaveArticle}
                            onNotRelevant={handleNotRelevant}
                            defaultExpanded={true}
                          />
                        ))}
                      </section>
                    )}

                    {briefContent.important && briefContent.important.length > 0 && (
                      <section className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-4 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          Perlu Diketahui
                        </h2>
                        {briefContent.important.map((article, idx) => (
                          <BriefCard
                            key={idx}
                            item={article}
                            priority="important"
                            onSave={handleSaveArticle}
                            onNotRelevant={handleNotRelevant}
                          />
                        ))}
                      </section>
                    )}

                    {briefContent.background && briefContent.background.length > 0 && (
                      <section className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          Untuk Dipantau
                        </h2>
                        {briefContent.background.map((article, idx) => (
                          <BriefCard
                            key={idx}
                            item={article}
                            priority="background"
                            onSave={handleSaveArticle}
                            onNotRelevant={handleNotRelevant}
                          />
                        ))}
                      </section>
                    )}

                    {briefContent.councilAgreement && (
                      <div className="bg-secondary/20 rounded-lg p-4 text-sm">
                        <p className="font-medium mb-1">Catatan AI</p>
                        <p className="text-muted-foreground">{briefContent.councilAgreement}</p>
                        {briefContent.confidenceNote && (
                          <p className="text-xs text-muted-foreground mt-2">{briefContent.confidenceNote}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!hasBrief && !briefLoading && articles.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground text-center">Sementara menunggu, berikut beberapa artikel terbaru dari database kami:</p>
                    
                    {criticalArticles.length > 0 && (
                      <section>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Perlu Perhatian Anda</h2>
                        </div>
                        <div className="space-y-6">
                          {criticalArticles.map(article => (
                            <LegacyBriefItem key={article.id} article={article} />
                          ))}
                        </div>
                      </section>
                    )}

                    {importantArticles.length > 0 && (
                      <section>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="h-3 w-3 rounded-full bg-amber-400" />
                          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Perlu Diketahui</h2>
                        </div>
                        <div className="space-y-6">
                          {importantArticles.map(article => (
                            <LegacyBriefItem key={article.id} article={article} />
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}

                <div className="bg-secondary/30 rounded-xl p-8 text-center space-y-4 mt-12">
                    <h3 className="font-serif font-bold text-lg">Bagaimana brief hari ini?</h3>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" className="rounded-full h-12 px-6 hover:bg-green-50 hover:text-green-600 hover:border-green-200" data-testid="button-helpful">
                            <ThumbsUp className="mr-2 h-4 w-4" /> Membantu
                        </Button>
                        <Button variant="outline" className="rounded-full h-12 px-6 hover:bg-red-50 hover:text-red-600 hover:border-red-200" data-testid="button-irrelevant">
                            <ThumbsDown className="mr-2 h-4 w-4" /> Tidak Relevan
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Feedback Anda membantu menyempurnakan kurasi berita.</p>
                </div>

            </div>
        </ScrollArea>
      </main>
    </div>
  );
}

function NavItem({ icon, label, isActive, isOpen, href }: { icon: React.ReactNode, label: string, isActive?: boolean, isOpen: boolean, href?: string }) {
    const content = (
        <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group",
            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
        )}>
            <div className={cn("transition-transform duration-200", isActive && "scale-105")}>{icon}</div>
            {isOpen && <span className="font-medium text-sm">{label}</span>}
            {isOpen && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return content;
}

function LegacyBriefItem({ article }: { article: Article }) {
    return (
        <div className="group relative pl-6 border-l-2 border-border hover:border-primary transition-colors">
            <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-background border-2 border-border group-hover:border-primary transition-colors" />
            
            <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="text-primary/80 bg-primary/5 px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">{article.source}</span>
                    <span>•</span>
                    <span>{new Date(article.publishedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                
                <h3 className="text-xl font-serif font-bold leading-tight group-hover:text-primary transition-colors">
                    {article.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                    {article.summary}
                </p>
            </div>

            {article.relevanceReason && (
              <div className="bg-secondary/30 rounded-lg p-3 text-sm border border-secondary">
                  <div className="flex gap-2 items-start">
                      <div className="mt-0.5 min-w-[16px]">✨</div>
                      <div className="space-y-1">
                          <p className="font-medium text-foreground/80">Mengapa ini penting:</p>
                          <p className="text-muted-foreground">{article.relevanceReason}</p>
                      </div>
                  </div>
              </div>
            )}
        </div>
    );
}
