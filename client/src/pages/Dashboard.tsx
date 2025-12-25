import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MOCK_USER, MOCK_BRIEF, Article } from "@/lib/mockData";
import { 
  LayoutDashboard, 
  Archive, 
  Bookmark, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  Menu,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
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
            <NavItem icon={<LayoutDashboard size={20} />} label="Today's Brief" isActive isOpen={sidebarOpen} />
            <NavItem icon={<Archive size={20} />} label="Archive" isOpen={sidebarOpen} />
            <NavItem icon={<Bookmark size={20} />} label="Saved Items" isOpen={sidebarOpen} />
            <NavItem icon={<Settings size={20} />} label="Settings" isOpen={sidebarOpen} />
        </nav>

        <div className="p-3 mt-auto border-t border-sidebar-border">
            <div className={cn("flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer", !sidebarOpen && "justify-center")}>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
                    PH
                </div>
                {sidebarOpen && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{MOCK_USER.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{MOCK_USER.organization}</p>
                    </div>
                )}
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="hidden md:block">
                    <p className="text-sm text-muted-foreground">Wednesday, 25 December 2025</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative hidden md:block w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Search intelligence..." 
                        className="w-full h-9 rounded-full bg-secondary/50 border-none pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                </Button>
            </div>
        </header>

        {/* Content Scroll Area */}
        <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10 pb-20">
                
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold">Good Morning, Pak Halim</h1>
                    <p className="text-lg text-muted-foreground">Here is your intelligence brief. 5 items require your attention.</p>
                </div>

                {/* CRITICAL SECTION */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Requires Attention</h2>
                    </div>
                    <div className="space-y-6">
                        {MOCK_BRIEF.filter(a => a.category === "Critical").map(article => (
                            <BriefItem key={article.id} article={article} />
                        ))}
                    </div>
                </section>

                <Separator />

                {/* IMPORTANT SECTION */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-3 w-3 rounded-full bg-amber-400" />
                        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Worth Knowing</h2>
                    </div>
                    <div className="space-y-6">
                        {MOCK_BRIEF.filter(a => a.category === "Important").map(article => (
                            <BriefItem key={article.id} article={article} />
                        ))}
                    </div>
                </section>

                 <Separator />

                {/* BACKGROUND SECTION */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">On Your Radar</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        {MOCK_BRIEF.filter(a => a.category === "Background").map(article => (
                             <BackgroundItem key={article.id} article={article} />
                        ))}
                    </div>
                </section>

                {/* Footer Feedback */}
                <div className="bg-secondary/30 rounded-xl p-8 text-center space-y-4 mt-12">
                    <h3 className="font-serif font-bold text-lg">How was today's brief?</h3>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" className="rounded-full h-12 px-6 hover:bg-green-50 hover:text-green-600 hover:border-green-200">
                            <ThumbsUp className="mr-2 h-4 w-4" /> Helpful
                        </Button>
                        <Button variant="outline" className="rounded-full h-12 px-6 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                            <ThumbsDown className="mr-2 h-4 w-4" /> Irrelevant
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Your feedback trains the curation engine.</p>
                </div>

            </div>
        </ScrollArea>
      </main>
    </div>
  );
}

function NavItem({ icon, label, isActive, isOpen }: { icon: React.ReactNode, label: string, isActive?: boolean, isOpen: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group",
            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
        )}>
            <div className={cn("transition-transform duration-200", isActive && "scale-105")}>{icon}</div>
            {isOpen && <span className="font-medium text-sm">{label}</span>}
            {isOpen && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
    );
}

function BriefItem({ article }: { article: Article }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="group relative pl-6 border-l-2 border-border hover:border-primary transition-colors">
            <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-background border-2 border-border group-hover:border-primary transition-colors" />
            
            <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="text-primary/80 bg-primary/5 px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">{article.source}</span>
                    <span>•</span>
                    <span>{new Date(article.publishedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="ml-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-6 w-6"><Bookmark className="h-3.5 w-3.5" /></Button>
                         <Button variant="ghost" size="icon" className="h-6 w-6"><Share2 className="h-3.5 w-3.5" /></Button>
                    </span>
                </div>
                
                <h3 className="text-xl font-serif font-bold leading-tight group-hover:text-primary transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
                    {article.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                    {article.summary}
                </p>
            </div>

            {/* AI Insight Box */}
            <div className="bg-secondary/30 rounded-lg p-3 text-sm border border-secondary relative overflow-hidden">
                <div className="flex gap-2 items-start">
                    <div className="mt-0.5 min-w-[16px]">✨</div>
                    <div className="space-y-1">
                        <p className="font-medium text-foreground/80">Why this matters to you:</p>
                        <p className="text-muted-foreground">{article.relevanceReason}</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-3 flex gap-2">
                {article.topics.map(t => (
                    <span key={t} className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">{t}</span>
                ))}
                 <Button variant="link" className="ml-auto h-auto p-0 text-xs text-primary" onClick={() => setExpanded(!expanded)}>
                    {expanded ? "Read Less" : "Read Analysis"} <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

function BackgroundItem({ article }: { article: Article }) {
    return (
        <div className="p-4 rounded-xl border border-border hover:bg-secondary/20 transition-colors group cursor-pointer">
             <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground mb-2">
                <span className="uppercase tracking-wider">{article.source}</span>
                <span>•</span>
                <span>4h ago</span>
            </div>
            <h4 className="font-serif font-bold text-base mb-2 group-hover:text-primary transition-colors line-clamp-2">{article.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{article.summary}</p>
            <div className="flex items-center text-xs text-primary font-medium">
                Why: {article.relevanceReason.substring(0, 40)}...
            </div>
        </div>
    )
}