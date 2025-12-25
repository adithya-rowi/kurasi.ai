import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Send, Loader2, User, Building2, Briefcase } from "lucide-react";
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

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleProfileSubmit = async () => {
    if (!userData.fullName || !userData.email || !userData.role || !userData.organization) {
      toast.error("Mohon lengkapi semua data");
      return;
    }

    setLoading(true);
    try {
      const user = await userApi.create({
        ...userData,
        languagePreference: "id",
        onboardingCompleted: false,
      });
      setUserId(user.id);
      session.setUserId(user.id);
      
      const response = await onboardingApi.start(user.id);
      setMessages([{ role: "assistant", content: response.message }]);
      setStep("chat");
    } catch (error: any) {
      toast.error(error.message || "Gagal memulai onboarding");
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
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim pesan");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleComplete = async () => {
    if (!userId) return;
    setStep("generating");

    try {
      await onboardingApi.complete(userId);
      toast.success("Profil intelijen Anda telah dibuat!");
      setTimeout(() => setLocation("/dashboard"), 2000);
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat profil");
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-2xl mx-auto px-6 pt-12 pb-8">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Kurasi<span className="text-amber-400">.ai</span></h1>
            <p className="text-amber-400 font-medium">Intelijen Berita Personal</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-white text-center mb-4">
              5 AI Bekerja Untuk Anda Setiap Pagi
            </h2>
            
            <div className="flex justify-center items-center gap-2 mb-4">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800">GPT</div>
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800">Gem</div>
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800">DS</div>
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800">Grk</div>
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800">Cld</div>
              </div>
              <span className="text-white/60 mx-2">→</span>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <span className="text-white text-lg">📋</span>
              </div>
            </div>
            
            <p className="text-white/70 text-center text-sm leading-relaxed">
              Seperti memiliki <span className="text-amber-400 font-medium">5 analis riset pribadi</span> yang 
              menyaring ratusan berita setiap hari, dan hanya menyajikan yang 
              <span className="text-amber-400 font-medium"> relevan untuk Anda</span>.
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-amber-400 font-bold">1</span>
              </div>
              <p className="text-white/60 text-xs">Ceritakan minat Anda</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-amber-400 font-bold">2</span>
              </div>
              <p className="text-white/60 text-xs">AI memahami kebutuhan</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-amber-400 font-bold">3</span>
              </div>
              <p className="text-white/60 text-xs">Terima brief personal</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              Mulai Sekarang
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              Isi data singkat, lalu kita akan berbincang untuk memahami kebutuhan Anda.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Contoh: Halim Alamsyah"
                    className="pl-9 py-3 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    value={userData.fullName}
                    onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
                    data-testid="input-fullname"
                  />
                </div>
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </Label>
                <Input
                  type="email"
                  placeholder="email@perusahaan.com"
                  className="py-3 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">
                  Jabatan / Peran
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                  <Select value={userData.role} onValueChange={(value) => setUserData({ ...userData, role: value })}>
                    <SelectTrigger className="pl-9 py-3 border-slate-200 rounded-xl" data-testid="select-role">
                      <SelectValue placeholder="Pilih jabatan Anda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CEO / Direktur Utama">CEO / Direktur Utama</SelectItem>
                      <SelectItem value="Direktur / Board Member">Direktur / Board Member</SelectItem>
                      <SelectItem value="Komisaris">Komisaris</SelectItem>
                      <SelectItem value="Advisor / Penasihat">Advisor / Penasihat</SelectItem>
                      <SelectItem value="Investor / Fund Manager">Investor / Fund Manager</SelectItem>
                      <SelectItem value="Pejabat Pemerintah">Pejabat Pemerintah</SelectItem>
                      <SelectItem value="Akademisi / Peneliti">Akademisi / Peneliti</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-slate-700 mb-1">
                  Organisasi
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Nama perusahaan atau institusi"
                    className="pl-9 py-3 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    value={userData.organization}
                    onChange={(e) => setUserData({ ...userData, organization: e.target.value })}
                    data-testid="input-organization"
                  />
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleProfileSubmit}
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white py-4 rounded-xl font-semibold text-lg h-auto"
              data-testid="button-continue"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Mulai Percakapan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-center text-xs text-slate-400 mt-4">
              🔒 Data Anda aman dan tidak akan dibagikan
            </p>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-white/40 text-xs mb-3">DIPERCAYA OLEH EKSEKUTIF DARI</p>
            <div className="flex justify-center items-center gap-6 opacity-50">
              <span className="text-white/60 text-sm font-medium">Bank Indonesia</span>
              <span className="text-white/30">•</span>
              <span className="text-white/60 text-sm font-medium">Sinarmas</span>
              <span className="text-white/30">•</span>
              <span className="text-white/60 text-sm font-medium">Barito Pacific</span>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800 animate-pulse">GPT</div>
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800 animate-pulse" style={{ animationDelay: "0.1s" }}>Gem</div>
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800 animate-pulse" style={{ animationDelay: "0.2s" }}>DS</div>
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800 animate-pulse" style={{ animationDelay: "0.3s" }}>Grk</div>
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800 animate-pulse" style={{ animationDelay: "0.4s" }}>Cld</div>
            </div>
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2 text-white" data-testid="text-generating-title">Membuat Profil Intelijen Anda</h2>
          <p className="text-white/70 mb-4">AI sedang menganalisis percakapan untuk membangun sistem kurasi berita personal...</p>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="border-b border-white/10 p-4 bg-slate-900/50 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-white" data-testid="text-chat-title">Kurasi<span className="text-amber-400">.ai</span></h1>
              <p className="text-xs text-white/60">Membangun profil berita personal Anda</p>
            </div>
          </div>
          {isComplete && (
            <Button onClick={handleComplete} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-complete-onboarding">
              Selesai <ArrowRight className="h-4 w-4" />
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
                        ? "bg-amber-500 text-white"
                        : "bg-white/10 border border-white/10 text-white"
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
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white/10 border border-white/10 text-white">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{streamingContent}</p>
                  <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t border-white/10 p-4 bg-slate-900/50 backdrop-blur">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan Anda..."
            className="min-h-[48px] max-h-32 resize-none rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40"
            disabled={isStreaming}
            data-testid="input-chat-message"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isStreaming}
            size="icon"
            className="h-12 w-12 rounded-xl bg-amber-500 hover:bg-amber-600"
            data-testid="button-send-message"
          >
            {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
