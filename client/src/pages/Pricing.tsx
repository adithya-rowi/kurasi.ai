import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { subscriptionApi, SubscriptionStatus, SubscriptionPlan } from "@/lib/api";
import { session } from "@/lib/session";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ArrowLeft, Crown, Mail, Zap, Archive, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Pricing() {
  const [_, setLocation] = useLocation();
  const userId = session.getUserId();
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => subscriptionApi.getPlans(),
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", userId],
    queryFn: () => (userId ? subscriptionApi.getStatus(userId) : null),
    enabled: !!userId,
  });

  const activateMutation = useMutation({
    mutationFn: (planName: string) => {
      if (!userId) throw new Error("Not logged in");
      return subscriptionApi.activate(userId, planName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", userId] });
      toast.success("Welcome to Premium! Email delivery is now available.");
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to activate subscription");
    },
  });

  const freePlan = plans.find((p) => p.name === "free");
  const premiumPlan = plans.find((p) => p.name === "premium");
  const enterprisePlan = plans.find((p) => p.name === "enterprise");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-serif font-bold">
              C
            </div>
            <span className="font-serif font-bold text-lg">CurateAI</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold mb-4" data-testid="text-pricing-title">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get your personalized intelligence brief delivered to your inbox every morning. 
            Like having a personal research analyst, but powered by AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="border border-border rounded-xl p-6 bg-card" data-testid="card-plan-free">
            <h3 className="text-xl font-bold mb-2">Free</h3>
            <div className="text-3xl font-bold mb-4">
              IDR 0<span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> View briefs in app
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> 1 brief per day
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> Save articles
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> 7-day archive
              </li>
            </ul>
            <Button
              variant="outline"
              className="w-full"
              disabled={subscription?.plan === "free" || !subscription?.isPremium}
              data-testid="button-select-free"
            >
              {!subscription?.isPremium ? "Current Plan" : "Downgrade"}
            </Button>
          </div>

          <div
            className="border-2 border-primary rounded-xl p-6 bg-card relative"
            data-testid="card-plan-premium"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Crown className="h-3 w-3" /> Most Popular
            </div>
            <h3 className="text-xl font-bold mb-2">Premium</h3>
            <div className="text-3xl font-bold mb-4">
              IDR 79k<span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> Everything in Free
              </li>
              <li className="flex items-center gap-2 text-sm font-medium text-primary">
                <Mail className="h-4 w-4" /> Email delivery
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-amber-500" /> Breaking alerts
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Archive className="h-4 w-4 text-muted-foreground" /> 90-day archive
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" /> Priority support
              </li>
            </ul>
            <Button
              className="w-full"
              disabled={subscription?.isPremium || activateMutation.isPending}
              onClick={() => activateMutation.mutate("premium")}
              data-testid="button-select-premium"
            >
              {subscription?.isPremium ? "Current Plan" : activateMutation.isPending ? "Activating..." : "Upgrade to Premium"}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Demo mode - no payment required
            </p>
          </div>

          <div className="border border-border rounded-xl p-6 bg-card" data-testid="card-plan-enterprise">
            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
            <div className="text-3xl font-bold mb-4">
              Custom<span className="text-sm font-normal text-muted-foreground"> pricing</span>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> Everything in Premium
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> Multiple users
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> Custom news sources
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> API access
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" /> 365-day archive
              </li>
            </ul>
            <Button variant="outline" className="w-full" data-testid="button-contact-sales">
              Contact Sales
            </Button>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <h3 className="font-serif font-bold text-xl mb-3">
            Why executives choose CurateAI Premium
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Imagine waking up to a personalized intelligence brief in your inbox, curated by 
            multiple AI perspectives that understand your role, your industry, and your 
            decision-making needs. No more scrolling through irrelevant news - just the 
            intelligence that matters to you.
          </p>
        </div>
      </main>
    </div>
  );
}
