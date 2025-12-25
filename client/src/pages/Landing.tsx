import { LandingNavbar } from "@/components/LandingNavbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Globe2, ShieldCheck, Zap } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import heroBg from "@assets/generated_images/abstract_digital_news_intelligence_background.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/10 selection:text-primary">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="Background" 
            className="w-full h-full object-cover opacity-[0.03] dark:opacity-[0.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Intelligence, Refined
              </div>
              <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.1] tracking-tight">
                Your Personal <br />
                <span className="text-primary italic">Intelligence Unit</span>
              </h1>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Hyper-personalized daily briefs for leaders who shape markets and policy. 
              The signal in the noise, delivered by 6 AM.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/onboarding">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  Start Your Briefing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-secondary/50">
                View Sample Brief
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-border/50 bg-secondary/30">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm font-semibold text-muted-foreground mb-8 uppercase tracking-widest">Trusted by leaders at</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {['Nusantara Capital', 'Bank Indonesia', 'GoTo Group', 'Astra International', 'Telkom Indonesia'].map((brand) => (
              <span key={brand} className="text-xl font-serif font-bold text-foreground/80">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<Globe2 className="w-10 h-10 text-primary" />}
              title="Global Reach, Local Depth"
              description="We scan 10,000+ sources from Bloomberg to local dailies, ensuring you never miss a critical development affecting Indonesia."
            />
            <FeatureCard 
              icon={<Zap className="w-10 h-10 text-primary" />}
              title="AI-Powered Relevance"
              description="Our proprietary engine learns your role and interests. If it's not actionable for you, it doesn't make the brief."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-10 h-10 text-primary" />}
              title="Executive First"
              description="Zero clickbait. No ads. Just pure, high-density intelligence formatted for 5-minute absorption."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-secondary/20">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">How CurateAI Works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to reclaim your morning.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
              <Step 
                number="01"
                title="Define Your Scope"
                description="Tell us your role, sector, and key interests. Select from 50+ topics including Monetary Policy, Commodities, and ASEAN Geopolitics."
              />
              <Step 
                number="02"
                title="We Analyze & Curate"
                description="While you sleep, our AI reads millions of articles, cross-referencing them against your profile to find the 1% that matters."
              />
              <Step 
                number="03"
                title="Brief Delivered"
                description="Wake up to a perfectly formatted brief in your inbox or app. Critical updates first, background noise filtered out."
              />
            </div>
            <div className="relative h-[600px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden p-8 flex flex-col">
              {/* Mock UI Representation */}
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-secondary"></div>
                <div>
                  <div className="h-4 w-32 bg-secondary rounded mb-2"></div>
                  <div className="h-3 w-20 bg-secondary/50 rounded"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-primary/5 rounded-xl border-l-4 border-primary p-4">
                  <div className="h-4 w-3/4 bg-primary/20 rounded mb-3"></div>
                  <div className="h-3 w-full bg-secondary rounded mb-2"></div>
                  <div className="h-3 w-5/6 bg-secondary rounded"></div>
                </div>
                <div className="h-24 bg-card border border-border rounded-xl p-4"></div>
                <div className="h-24 bg-card border border-border rounded-xl p-4"></div>
                <div className="h-24 bg-card border border-border rounded-xl p-4"></div>
              </div>
              
              <div className="mt-auto pt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Ready by 06:00 AM
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-background">
        <div className="container mx-auto px-6">
           <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Investing in Clarity</h2>
            <p className="text-muted-foreground text-lg">Simple pricing for serious professionals.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PricingCard 
              title="Professional"
              price="IDR 199k"
              period="/ month"
              features={['Daily Briefing (Email)', 'Top 10 Stories', 'Basic Personalization', 'Web Archive Access']}
            />
            <PricingCard 
              title="Executive"
              price="IDR 499k"
              period="/ month"
              featured={true}
              features={['Everything in Professional', 'Deep Dive Analysis', 'Unlimited Sources', 'Priority Keywords', 'WhatsApp Delivery']}
            />
            <PricingCard 
              title="Enterprise"
              price="Custom"
              period=""
              features={['Team Accounts', 'Custom Data Sources', 'API Access', 'White-label Reports', 'Dedicated Analyst']}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <span className="font-serif font-bold text-2xl tracking-tight mb-4 block">CurateAI</span>
              <p className="text-white/60 max-w-xs">
                Empowering Indonesian leaders with clarity and foresight in an increasingly complex world.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Platform</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Login</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-white/40 text-sm">
            <p>© 2025 CurateAI. All rights reserved.</p>
            <p>Jakarta • Singapore</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-secondary/10 border border-border hover:border-primary/20 transition-colors">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-6">
      <div className="font-serif text-4xl font-bold text-primary/20">{number}</div>
      <div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function PricingCard({ title, price, period, features, featured = false }: { title: string, price: string, period: string, features: string[], featured?: boolean }) {
  return (
    <div className={`p-8 rounded-2xl border ${featured ? 'bg-primary text-primary-foreground border-primary shadow-xl scale-105' : 'bg-card border-border'} flex flex-col relative`}>
      {featured && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
          Most Popular
        </div>
      )}
      <h3 className={`text-lg font-bold mb-2 ${featured ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{title}</h3>
      <div className="mb-8">
        <span className="text-4xl font-serif font-bold">{price}</span>
        <span className={`text-sm ${featured ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{period}</span>
      </div>
      <ul className="space-y-4 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            <CheckCircle2 className={`w-5 h-5 ${featured ? 'text-primary-foreground' : 'text-primary'}`} />
            <span className={featured ? 'text-primary-foreground/90' : 'text-foreground/80'}>{feature}</span>
          </li>
        ))}
      </ul>
      <Button variant={featured ? "secondary" : "outline"} className="w-full h-12 rounded-xl font-bold">
        Choose {title}
      </Button>
    </div>
  );
}