import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Search } from "lucide-react";
import { MOCK_BRIEF } from "@/lib/mockData";

export default function Archive() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-3xl font-serif font-bold">Brief Archive</h1>
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <Card className="p-4 h-fit">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow-sm"
            />
          </Card>

          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search past briefs..." 
                className="w-full h-10 rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-4">
              <h2 className="font-bold text-lg">
                Brief for {date?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              
              {/* Reuse mock data for demo */}
              {MOCK_BRIEF.slice(0, 3).map(article => (
                <div key={article.id} className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{article.category}</span>
                    <span className="text-xs text-muted-foreground">{article.source}</span>
                  </div>
                  <h3 className="font-serif font-bold text-lg mb-2">{article.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
