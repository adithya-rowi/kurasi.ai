import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Bookmark, Trash2, ExternalLink } from "lucide-react";
import { MOCK_BRIEF } from "@/lib/mockData";

export default function Saved() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg">
                <Bookmark className="h-6 w-6 text-primary" />
             </div>
             <h1 className="text-3xl font-serif font-bold">Saved Intelligence</h1>
          </div>
        </div>

        <div className="grid gap-6">
            {MOCK_BRIEF.slice(0, 2).map(article => (
                <Card key={article.id} className="p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <span className="text-primary bg-primary/5 px-2 py-0.5 rounded uppercase tracking-wider">{article.source}</span>
                            <span>•</span>
                            <span>Saved today</span>
                        </div>
                        <h3 className="text-xl font-serif font-bold">{article.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{article.summary}</p>
                        
                         <div className="bg-secondary/30 rounded p-3 text-sm border border-secondary mt-4">
                            <span className="font-medium">My Notes:</span> <span className="text-muted-foreground italic">Review impact on Q3 strategy...</span>
                        </div>
                    </div>
                    
                    <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0">
                        <Button variant="outline" className="w-full">
                            <ExternalLink className="mr-2 h-4 w-4" /> Read
                        </Button>
                        <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
