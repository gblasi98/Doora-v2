
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import { askGeminiAssistant } from '../services/geminiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Ciao! Sono il tuo assistente Doora. Come posso aiutarti oggi con i tuoi pacchi o con i vicini?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const response = await askGeminiAssistant(userMsg);
    
    setMessages(prev => [...prev, { role: 'assistant', content: response || "Nessuna risposta disponibile." }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar"
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-purple-100 text-purple-600'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-3xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 shadow-sm rounded-tl-none text-slate-800'}`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] flex gap-3 flex-row">
              <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin" />
              </div>
              <div className="p-4 bg-white border border-slate-100 shadow-sm rounded-3xl rounded-tl-none">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 pt-2">
        <div className="relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Chiedi qualcosa..."
            className="w-full bg-white border border-slate-200 rounded-full py-4 pl-6 pr-14 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 p-3 bg-indigo-600 text-white rounded-full disabled:opacity-50 transition-all hover:bg-indigo-700 active:scale-90"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
