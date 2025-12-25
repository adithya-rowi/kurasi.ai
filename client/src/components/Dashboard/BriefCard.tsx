import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Bookmark, ThumbsDown, BookmarkCheck } from "lucide-react";
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

export function BriefCard({ item, priority, onSave, onNotRelevant, defaultExpanded }: BriefCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? priority === "critical");
  const [saved, setSaved] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  const styles = priorityConfig[priority];

  if (dismissed) {
    return null;
  }
  
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
          <span className="text-xs text-muted-foreground bg-background/60 px-2 py-1 rounded inline-flex items-center gap-1">
            📰 {item.source}
            {(item.sourceType === "local" || !item.sourceType) && (
              <span className="text-amber-600">🇮🇩</span>
            )}
          </span>
          
          {item.isPaywalled === true && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded inline-flex items-center gap-1">
              🔒 Berbayar
            </span>
          )}
          
          {item.foundByPerspectives && item.foundByPerspectives.length > 1 && (
            <span className={cn("text-xs px-2 py-1 rounded", styles.badge)}>
              ✓ {item.foundByPerspectives.length} AI setuju
            </span>
          )}
          
          {item.verificationScore && item.verificationScore >= 8 && (
            <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
              Keyakinan tinggi
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
          
          {item.isPaywalled === true && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700">
                🔒 Artikel ini memerlukan langganan {item.source}. 
                Klik link untuk membaca jika Anda sudah berlangganan.
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center gap-3">
              {item.url && item.url !== "search required" && item.url !== "perlu verifikasi" && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="link-read-article"
                >
                  {item.isPaywalled ? `Buka di ${item.source}` : "Baca selengkapnya"} <ExternalLink size={14} />
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
          
          {item.foundByPerspectives && item.foundByPerspectives.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.foundByPerspectives.map((p) => (
                <span 
                  key={p} 
                  className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
