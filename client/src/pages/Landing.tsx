import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Zap } from 'lucide-react';
import { Link } from 'wouter';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Landing() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const sendMessage = async (messageToSend?: string) => {
    const msg = messageToSend || input;
    if (!msg.trim() || isLoading) return;
    
    setHasStarted(true);
    setInput('');
    
    const newUserMessage: Message = { role: 'user', content: msg };
    const updatedHistory = [...messages, newUserMessage];
    
    setMessages(updatedHistory);
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/chat/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: msg,
          history: messages
        })
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.response) {
        throw new Error(data.error || 'No response');
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response 
      }]);
    } catch (err) {
      console.error('Demo chat error:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan coba lagi dalam beberapa saat.' 
      }]);
    }
    
    setIsLoading(false);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    {
      text: "Apa yang perlu saya tahu tentang keputusan BI hari ini?",
      icon: "🏦"
    },
    {
      text: "Rangkum berita OJK terbaru tentang fintech",
      icon: "📋"
    },
    {
      text: "Update harga komoditas: nikel, CPO, batubara",
      icon: "📈"
    },
    {
      text: "Kebijakan pemerintah yang mempengaruhi bisnis minggu ini",
      icon: "🏛️"
    }
  ];
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <span className="font-serif font-bold text-lg text-slate-900">CurateAI</span>
          </div>
          
          <Link href="/onboarding">
            <button className="text-sm text-slate-600 hover:text-slate-900 font-medium" data-testid="link-login">
              Masuk
            </button>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 max-w-4xl w-full mx-auto flex flex-col">
        
        {!hasStarted && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                5 AI • 100+ Sumber • 1 Brief untuk Anda
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                Intelijen Bisnis
                <br />
                <span className="text-amber-600">untuk Eksekutif Indonesia</span>
              </h1>
              
              <p className="text-lg text-slate-600 max-w-xl mx-auto">
                Setiap pagi, 5 AI menyaring ratusan berita dan menyajikan hanya yang 
                <strong> penting untuk keputusan Anda</strong>. Coba sekarang.
              </p>
            </div>
            
            <div className="w-full max-w-2xl">
              <p className="text-sm text-slate-500 mb-3 text-center font-medium">Coba tanyakan:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(prompt.text)}
                    className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all group"
                    data-testid={`button-quick-prompt-${idx}`}
                  >
                    <span className="text-2xl mb-2 block">{prompt.icon}</span>
                    <p className="text-slate-700 text-sm">{prompt.text}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-medium">DIBUAT UNTUK EKSEKUTIF INDONESIA</p>
              <div className="flex items-center justify-center gap-4 text-slate-500 text-sm">
                <span>Perbankan</span>
                <span className="text-slate-300">•</span>
                <span>Komoditas</span>
                <span className="text-slate-300">•</span>
                <span>Kebijakan</span>
                <span className="text-slate-300">•</span>
                <span>Fintech</span>
              </div>
            </div>
          </div>
        )}
        
        {hasStarted && (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 text-white rounded-2xl rounded-br-md px-4 py-3' 
                      : 'bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                        <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-medium text-slate-500">CurateAI</span>
                      </div>
                    )}
                    <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      msg.role === 'user' ? 'text-white' : 'text-slate-700'
                    }`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white animate-pulse" />
                      </div>
                      <span className="text-sm text-slate-500">Sedang menganalisis...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
        
        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Tanyakan tentang berita bisnis Indonesia..."
                className="flex-1 px-4 py-3 bg-slate-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition-all text-slate-900 placeholder-slate-400 text-base"
                disabled={isLoading}
                data-testid="input-chat"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl transition-colors flex items-center gap-2"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {messages.length >= 2 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl text-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="font-semibold">Brief seperti ini, setiap pagi.</p>
                    <p className="text-sm text-slate-300">Gratis untuk 7 hari pertama</p>
                  </div>
                  <Link href="/onboarding">
                    <button
                      className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap"
                      data-testid="button-register-cta"
                    >
                      Coba Gratis →
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        
      </main>
    </div>
  );
}
