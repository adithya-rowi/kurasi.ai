import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Bookmark, ThumbsDown, BookmarkCheck, Shield, Bot, AlertCircle, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BriefItem {
  title: string;
  summary: string;
  source: string;
  sourceType?: "local" | "regional" | "global";
  url: string;
  isPaywalled?: boolean;
  whyItMatters: string;
  foundByPerspectives?: string[];
  verificationScore?: number;
  publishedDate?: string;
}

interface BriefCardProps {
  item: BriefItem;
  priority: "critical" | "important" | "background";
  onSave?: (item: BriefItem) => void;
  onNotRelevant?: (item: BriefItem) => void;
  defaultExpanded?: boolean;
}

const priorityConfig = {
  critical: {
    border: "border-l-destructive",
    bg: "bg-destructive/5 hover:bg-destructive/10",
    badge: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  important: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/5 hover:bg-amber-500/10",
    badge: "bg-amber-500/10 text-amber-700",
    dot: "bg-amber-500",
  },
  background: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/5 hover:bg-emerald-500/10",
    badge: "bg-emerald-500/10 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

function getTrustLevel(score: number, modelCount: number) {
  if (score >= 8 && modelCount >= 2) return { level: "high", label: "Sangat Terpercaya", color: "green" };
  if (score >= 6 && modelCount >= 1) return { level: "medium", label: "Terpercaya", color: "amber" };
  return { level: "low", label: "Perlu Verifikasi", color: "red" };
}

export function BriefCard({ item, priority, onSave, onNotRelevant, defaultExpanded }: BriefCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? priority === "critical");
  const [saved, setSaved] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  const styles = priorityConfig[priority];
  const trust = getTrustLevel(item.verificationScore || 7, item.foundByPerspectives?.length || 1);

  if (dismissed) {
    return null;
  }

  const hasValidUrl = item.url && item.url !== "search required" && item.url !== "perlu verifikasi";
  
  return (
    <div 
      className={cn(
        "border-l-4 rounded-lg mb-4 overflow-hidden transition-all duration-200",
        styles.border,
        styles.bg
      )}
      data-testid={`brief-card-${item.title.slice(0, 20).replace(/\s+/g, "-")}`}
    >
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-lg leading-tight text-foreground">
              {item.title}
            </h3>
            
            {!expanded && (
              <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                {item.summary}
              </p>
            )}
          </div>
          
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {hasValidUrl ? (
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs bg-background/80 hover:bg-background text-foreground/80 px-2.5 py-1.5 rounded-lg transition-colors"
              data-testid="link-source-badge"
            >
              {(item.sourceType === "local" || !item.sourceType) && <span>🇮🇩</span>}
              {item.sourceType === "regional" && <span>🌏</span>}
              {item.sourceType === "global" && <span>🌍</span>}
              <span className="font-medium">{item.source}</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs bg-background/60 text-foreground/70 px-2.5 py-1.5 rounded-lg">
              {(item.sourceType === "local" || !item.sourceType) && <span>🇮🇩</span>}
              {item.sourceType === "regional" && <span>🌏</span>}
              {item.sourceType === "global" && <span>🌍</span>}
              <span className="font-medium">{item.source}</span>
            </span>
          )}
          
          {item.isPaywalled === true && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1.5 rounded-lg">
              🔒 Berbayar
            </span>
          )}
          
          <span className={cn(
            "inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg",
            trust.color === "green" && "bg-emerald-100 text-emerald-700",
            trust.color === "amber" && "bg-amber-100 text-amber-700",
            trust.color === "red" && "bg-red-100 text-red-700"
          )}>
            {trust.color === "green" && <CheckCircle2 className="w-3 h-3" />}
            {trust.color === "amber" && <Shield className="w-3 h-3" />}
            {trust.color === "red" && <AlertCircle className="w-3 h-3" />}
            {trust.label}
          </span>
          
          {item.foundByPerspectives && item.foundByPerspectives.length > 1 && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1.5 rounded-lg">
              <Bot className="w-3 h-3" />
              {item.foundByPerspectives.length} AI setuju
            </span>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 bg-background/50">
          <p className="text-foreground/80 mt-4 leading-relaxed">
            {item.summary}
          </p>
          
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-sm font-medium text-primary mb-1 flex items-center gap-1">
              <span>💡</span> Mengapa ini penting untuk Anda:
            </p>
            <p className="text-sm text-foreground/70">
              {item.whyItMatters}
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              🔍 Transparansi & Verifikasi
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <LinkIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500">Sumber Asli:</p>
                  {hasValidUrl ? (
                    <a 
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.url}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400 italic">URL perlu verifikasi manual</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Ditemukan oleh:</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(item.foundByPerspectives || ["AI"]).map((model, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Skor Verifikasi:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full max-w-[100px]">
                      <div 
                        className={cn(
                          "h-2 rounded-full",
                          (item.verificationScore || 7) >= 8 && "bg-emerald-500",
                          (item.verificationScore || 7) >= 6 && (item.verificationScore || 7) < 8 && "bg-amber-500",
                          (item.verificationScore || 7) < 6 && "bg-red-500"
                        )}
                        style={{ width: `${(item.verificationScore || 7) * 10}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {item.verificationScore || 7}/10
                    </span>
                  </div>
                </div>
              </div>
              
              {item.publishedDate && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>📅 Dipublikasikan: {item.publishedDate}</span>
                </div>
              )}
            </div>
          </div>
          
          {item.isPaywalled === true && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700">
                🔒 Artikel lengkap memerlukan langganan {item.source}. 
                Kami hanya menampilkan ringkasan dari metadata publik.
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center gap-3">
              {hasValidUrl && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="link-read-article"
                >
                  Buka Sumber Asli <ExternalLink size={14} />
                </a>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSaved(!saved);
                  if (!saved) onSave?.(item);
                }}
                className={cn(
                  "h-8 px-2",
                  saved && "text-primary"
                )}
                title={saved ? "Tersimpan" : "Simpan"}
                data-testid="button-save-article"
              >
                {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissed(true);
                  onNotRelevant?.(item);
                }}
                className="h-8 px-2 hover:text-destructive hover:bg-destructive/10"
                title="Tidak relevan"
                data-testid="button-not-relevant"
              >
                <ThumbsDown size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
