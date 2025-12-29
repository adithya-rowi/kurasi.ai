import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Check, X, Loader2, ChevronRight, Briefcase, Building2, User } from "lucide-react";
import { useLocation } from "wouter";
import { MOCK_TOPICS } from "@/lib/mockData";
import { userApi, topicsApi, preferencesApi } from "@/lib/api";
import { session } from "@/lib/session";
import { toast } from "sonner";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [_, setLocation] = useLocation();
  const [progress, setProgress] = useState(25);
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    role: "",
    organization: "",
  });
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const nextStep = () => {
    setStep(s => s + 1);
    setProgress(p => p + 25);
  };

  const handleFinish = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mb-8">
        <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
          <span>Setup Profile</span>
          <span>Curate Interests</span>
          <span>Preferences</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md"
          >
            <ProfileStep onNext={nextStep} userData={userData} setUserData={setUserData} setUserId={setUserId} />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md"
          >
            <TopicSwipeStep onNext={nextStep} userId={userId} selectedTopics={selectedTopics} setSelectedTopics={setSelectedTopics} />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-lg"
          >
            <PreferencesStep onFinish={handleFinish} userId={userId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileStep({ onNext, userData, setUserData, setUserId }: { 
  onNext: () => void; 
  userData: any;
  setUserData: (data: any) => void;
  setUserId: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!userData.fullName || !userData.email || !userData.role || !userData.organization) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const user = await userApi.create({
        ...userData,
        languagePreference: "en",
        onboardingCompleted: false,
      });
      setUserId(user.id);
      session.setUserId(user.id);
      onNext();
    } catch (error: any) {
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 shadow-xl border-border/60">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Selamat datang di Loper</h2>
        <p className="text-muted-foreground">Let's build your intelligence profile.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              id="name" 
              placeholder="Halim Kusuma" 
              className="pl-9" 
              value={userData.fullName}
              onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email"
            placeholder="halim@nusantara.cap" 
            value={userData.email}
            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role / Title</Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Select value={userData.role} onValueChange={(value) => setUserData({ ...userData, role: value })}>
              <SelectTrigger className="pl-9">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Chief Executive Officer (CEO)">Chief Executive Officer (CEO)</SelectItem>
                <SelectItem value="Chief Investment Officer (CIO)">Chief Investment Officer (CIO)</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
                <SelectItem value="Policy Maker">Policy Maker</SelectItem>
                <SelectItem value="Investor">Investor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org">Organization</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              id="org" 
              placeholder="Nusantara Capital" 
              className="pl-9"
              value={userData.organization}
              onChange={(e) => setUserData({ ...userData, organization: e.target.value })}
            />
          </div>
        </div>

        <Button onClick={handleContinue} className="w-full h-12 text-lg" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function TopicSwipeStep({ onNext, userId, selectedTopics, setSelectedTopics }: { 
  onNext: () => void;
  userId: string | null;
  selectedTopics: string[];
  setSelectedTopics: (topics: string[]) => void;
}) {
  const [cards, setCards] = useState(MOCK_TOPICS);

  const handleSwipe = async (direction: 'left' | 'right', id: string, topicName: string) => {
    if (direction === 'right' && userId) {
      try {
        await topicsApi.create({
          userId,
          topicName,
          priority: 5,
        });
        setSelectedTopics([...selectedTopics, topicName]);
      } catch (error) {
        console.error("Failed to save topic:", error);
      }
    }
    setCards(current => current.filter(c => c.id !== id));
    if (cards.length <= 1) {
      setTimeout(onNext, 500);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-serif font-bold mb-2">What matters to you?</h2>
        <p className="text-muted-foreground">Swipe right to follow, left to skip.</p>
      </div>

      <div className="relative w-full h-[400px] flex justify-center items-center">
        <AnimatePresence>
          {cards.map((topic, index) => (
            <SwipeCard
              key={topic.id}
              topic={topic}
              isTop={index === cards.length - 1}
              onSwipe={(dir) => handleSwipe(dir, topic.id, topic.name)}
            />
          ))}
        </AnimatePresence>
        {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Saving preferences...</p>
            </div>
        )}
      </div>

      <div className="flex gap-8 mt-8">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-14 w-14 rounded-full border-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive"
          onClick={() => cards.length > 0 && handleSwipe('left', cards[cards.length - 1].id, cards[cards.length - 1].name)}
        >
          <X className="h-6 w-6" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-14 w-14 rounded-full border-2 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary"
          onClick={() => cards.length > 0 && handleSwipe('right', cards[cards.length - 1].id, cards[cards.length - 1].name)}
        >
          <Check className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

function SwipeCard({ topic, isTop, onSwipe }: { topic: any, isTop: boolean, onSwipe: (dir: 'left' | 'right') => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const background = useTransform(
    x,
    [-150, 0, 150],
    ["rgb(255, 200, 200)", "rgb(255, 255, 255)", "rgb(200, 255, 200)"]
  );

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  if (!isTop) {
    return (
      <Card className="absolute top-0 w-80 h-[380px] p-6 flex flex-col items-center justify-center text-center shadow-sm scale-95 opacity-50 -z-10 bg-card">
         <img src={topic.image} alt={topic.name} className="w-full h-40 object-cover rounded-md mb-4 grayscale opacity-50" />
         <h3 className="text-xl font-bold">{topic.name}</h3>
      </Card>
    );
  }

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute top-0 z-10 cursor-grab active:cursor-grabbing"
    >
      <Card className="w-80 h-[380px] p-0 overflow-hidden shadow-2xl border-primary/5 bg-card relative group">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        <img src={topic.image} alt={topic.name} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-500" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-white">
            <h3 className="text-2xl font-serif font-bold leading-tight mb-2">{topic.name}</h3>
            <p className="text-white/70 text-sm">Swipe right to track this topic</p>
        </div>

        {/* Swipe Indicators */}
        <motion.div 
            style={{ opacity: useTransform(x, [20, 100], [0, 1]) }}
            className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded font-bold uppercase tracking-widest z-30 transform -rotate-12 border-2 border-white"
        >
            TRACK
        </motion.div>
        <motion.div 
            style={{ opacity: useTransform(x, [-100, -20], [1, 0]) }}
            className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded font-bold uppercase tracking-widest z-30 transform rotate-12 border-2 border-white"
        >
            SKIP
        </motion.div>
      </Card>
    </motion.div>
  );
}


function PreferencesStep({ onFinish, userId }: { onFinish: () => void; userId: string | null }) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!userId) {
          toast.error("No user session found");
          return;
        }

        setLoading(true);
        try {
          await preferencesApi.create({
            userId,
            deliveryTime: "06:00",
            deliveryDays: [1, 2, 3, 4, 5],
            formatPreference: "brief",
            maxItems: 10,
            timezone: "Asia/Jakarta",
          });
          await userApi.updateOnboarding(userId, true);
          setTimeout(onFinish, 1000);
        } catch (error: any) {
          toast.error(error.message || "Failed to save preferences");
          setLoading(false);
        }
    };

  return (
    <Card className="p-8 shadow-xl border-border/60">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-serif font-bold mb-2">Final Touches</h2>
        <p className="text-muted-foreground">How should we deliver your intelligence?</p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
            <Label className="text-base">Delivery Time</Label>
            <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">06:00 AM</Button>
                <Button variant="outline" className="justify-start text-muted-foreground">07:00 AM</Button>
                <Button variant="outline" className="justify-start text-muted-foreground">08:00 AM</Button>
                <Button variant="outline" className="justify-start text-muted-foreground">09:00 AM</Button>
            </div>
        </div>

        <div className="space-y-4">
            <Label className="text-base">Format Preference</Label>
            <div className="space-y-3">
                 <div className="flex items-start space-x-3 p-3 rounded-lg border border-primary/20 bg-primary/5 cursor-pointer">
                    <Checkbox id="brief" checked disabled />
                    <div className="grid gap-1.5 leading-none">
                        <label
                            htmlFor="brief"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Quick Brief (5 min)
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Concise summaries with AI-explained relevance.
                        </p>
                    </div>
                 </div>
                 <div className="flex items-start space-x-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50">
                    <Checkbox id="detailed" />
                    <div className="grid gap-1.5 leading-none">
                        <label
                            htmlFor="detailed"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Detailed Analysis (15 min)
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Deep dives into critical stories.
                        </p>
                    </div>
                 </div>
            </div>
        </div>

        <Button onClick={handleSubmit} className="w-full h-12 text-lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating your first brief...
            </>
          ) : (
            "Finish & View Brief"
          )}
        </Button>
      </div>
    </Card>
  );
}
