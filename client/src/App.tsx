import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import OnboardingChat from "@/pages/OnboardingChat";
import Dashboard from "@/pages/Dashboard";
import Archive from "@/pages/Archive";
import Saved from "@/pages/Saved";
import Pricing from "@/pages/Pricing";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/onboarding" component={OnboardingChat} />
      <Route path="/onboarding-legacy" component={Onboarding} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/archive" component={Archive} />
      <Route path="/saved" component={Saved} />
      <Route path="/pricing" component={Pricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;