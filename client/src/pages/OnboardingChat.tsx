import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Send, Loader2, Sparkles, User, Building2, Briefcase } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { userApi, onboardingApi } from "@/lib/api";
import { session } from "@/lib/session";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function OnboardingChat() {
  const [step, setStep] = useState<"profile" | "chat" | "generating">("profile");
  const [_, setLocation] = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    role: "",
    organization: "",
  });
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleProfileSubmit = async () => {
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
      
      const response = await onboardingApi.start(user.id);
      setMessages([{ role: "assistant", content: response.message }]);
      setStep("chat");
    } catch (error: any) {
      toast.error(error.message || "Failed to start onboarding");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !userId || isStreaming) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/onboarding/${userId}/stream?message=${encodeURIComponent(userMessage)}`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
              if (data.done) {
                setMessages(prev => [...prev, { role: "assistant", content: fullContent }]);
                setStreamingContent("");
                if (data.isComplete) {
                  setIsComplete(true);
                }
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleComplete = async () => {
    if (!userId) return;
    setStep("generating");

    try {
      await onboardingApi.complete(userId);
      toast.success("Your intelligence profile has been created!");
      setTimeout(() => setLocation("/dashboard"), 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate profile");
      setStep("chat");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (step === "profile") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 shadow-xl border-border/60">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-serif font-bold mb-2" data-testid="text-welcome-title">Welcome to CurateAI</h2>
              <p className="text-muted-foreground">Let's start with some basic information, then we'll have a conversation to understand your unique intelligence needs.</p>
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
                    data-testid="input-fullname"
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
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role / Title</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Select value={userData.role} onValueChange={(value) => setUserData({ ...userData, role: value })}>
                    <SelectTrigger className="pl-9" data-testid="select-role">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chief Executive Officer (CEO)">Chief Executive Officer (CEO)</SelectItem>
                      <SelectItem value="Chief Investment Officer (CIO)">Chief Investment Officer (CIO)</SelectItem>
                      <SelectItem value="Chief Financial Officer (CFO)">Chief Financial Officer (CFO)</SelectItem>
                      <SelectItem value="Director">Director</SelectItem>
                      <SelectItem value="Managing Partner">Managing Partner</SelectItem>
                      <SelectItem value="Policy Maker">Policy Maker</SelectItem>
                      <SelectItem value="Investor">Investor</SelectItem>
                      <SelectItem value="Board Member">Board Member</SelectItem>
                      <SelectItem value="Other Executive">Other Executive</SelectItem>
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
                    data-testid="input-organization"
                  />
                </div>
              </div>

              <Button 
                onClick={handleProfileSubmit} 
                className="w-full h-12 text-lg" 
                disabled={loading}
                data-testid="button-continue"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Begin Conversation <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2" data-testid="text-generating-title">Creating Your Intelligence Profile</h2>
          <p className="text-muted-foreground mb-4">Our AI is analyzing your conversation to build a personalized news curation system...</p>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif font-bold" data-testid="text-chat-title">CurateAI Intelligence Advisor</h1>
              <p className="text-xs text-muted-foreground">Building your personalized news profile</p>
            </div>
          </div>
          {isComplete && (
            <Button onClick={handleComplete} className="gap-2" data-testid="button-complete-onboarding">
              Complete Setup <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-180px)]" ref={scrollAreaRef}>
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border/60"
                    }`}
                    data-testid={`message-${message.role}-${index}`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {streamingContent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-card border border-border/60">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{streamingContent}</p>
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                </div>
              </motion.div>
            )}

            {isStreaming && !streamingContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-card border border-border/60 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t border-border/60 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your thoughts..."
              className="min-h-[60px] max-h-[200px] pr-14 resize-none"
              disabled={isStreaming}
              data-testid="input-message"
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isStreaming}
              data-testid="button-send"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {isComplete 
              ? "Great conversation! Click 'Complete Setup' when you're ready to see your personalized dashboard."
              : "Tell me about your role, what information matters to you, and what decisions you need to make."}
          </p>
        </div>
      </div>
    </div>
  );
}
