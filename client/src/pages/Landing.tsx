import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BookOpen, Settings, LogIn, Workflow } from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

const OPENING_MESSAGE = `Halo! Saya **Kurasi**.

Saya akan menyiapkan brief harian yang personal untuk Anda.

**Ceritakan tentang diri Anda** - peran Anda saat ini dan apa yang sedang jadi fokus utama?`;

export default function Landing() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages 
        })
      });

      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response 
      }]);

      if (data.onboardingComplete && data.profileData) {
        sessionStorage.setItem('kurasiProfile', JSON.stringify(data.profileData));
        setTimeout(() => {
          setLocation('/register');
        }, 2000);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Maaf, ada gangguan. Coba lagi ya.' 
      }]);
    }
    
    setIsLoading(false);
  };

  const renderContent = (content: string) => {
    return content.split('**').map((part, i) => 
      i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{part}</strong> : part
    );
  };

  return (
    <div className="min-h-screen bg-white flex">
      
      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-60 bg-slate-50 border-r border-slate-200 flex-col">
        <div className="p-5 flex-1">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">K</span>
            </div>
            <span className="text-xl font-semibold text-slate-900">Kurasi</span>
          </div>

          {/* Nav */}
          <nav className="space-y-1">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-200/70 text-slate-900 font-medium text-sm" data-testid="nav-home">
              <Sparkles className="w-4 h-4" />
              Mulai
            </Link>
            <Link href="/how-it-works" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm" data-testid="nav-how-it-works">
              <Workflow className="w-4 h-4" />
              Cara Kerja
            </Link>
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm" data-testid="nav-dashboard">
              <BookOpen className="w-4 h-4" />
              Brief Saya
            </Link>
            <Link href="/pricing" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm" data-testid="nav-settings">
              <Settings className="w-4 h-4" />
              Pengaturan
            </Link>
          </nav>
        </div>

        {/* Login */}
        <div className="p-5 border-t border-slate-200">
          <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm" data-testid="nav-login">
            <LogIn className="w-4 h-4" />
            Masuk
          </Link>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col">
        
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-semibold">Kurasi</span>
          </div>
          <Link href="/login" className="text-sm text-slate-500" data-testid="mobile-login">Masuk</Link>
        </header>

        {/* Chat */}
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col">
          
          {/* Messages */}
          <div className="flex-1 space-y-6 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' ? (
                  <div className="max-w-[90%]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">K</span>
                      </div>
                      <span className="text-sm font-medium text-slate-700">Kurasi</span>
                    </div>
                    <div className="text-slate-700 leading-relaxed pl-9 whitespace-pre-wrap">
                      {renderContent(msg.content)}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[85%] bg-slate-900 text-white px-4 py-3 rounded-2xl rounded-br-sm">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 pl-9">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="mt-6">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ceritakan..."
                rows={1}
                className="w-full px-4 py-3 pr-12 bg-slate-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 placeholder-slate-400"
                data-testid="input-chat"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-3">
              6 AI bekerja untuk Anda. Setiap pagi.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
