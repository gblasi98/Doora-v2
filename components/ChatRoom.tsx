
import React, { useState, useRef, useEffect } from 'react';
import { Neighbor, User } from '../types';
import { Send, Camera, Paperclip, ChevronLeft, MoreVertical } from 'lucide-react';
import { getChatId, subscribeToMessages, sendMessage, sendNotification } from '../services/firebase';

interface Message {
  id: string;
  senderId?: string; // Real Firestore field
  role?: 'me' | 'them'; // UI Helper
  content: string;
  time: string;
}

interface ChatRoomProps {
  neighbor: Neighbor;
  onBack: () => void;
  currentUser: User; // Need this to know who "me" is
}

const ChatRoom: React.FC<ChatRoomProps> = ({ neighbor, onBack, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false); // Can be enhanced with real-time "typing" status later
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const chatId = getChatId(currentUser.id, neighbor.id);

  // Subscribe to real-time messages
  useEffect(() => {
      const unsubscribe = subscribeToMessages(chatId, (firebaseMessages) => {
          const formattedMessages = firebaseMessages.map(m => ({
              id: m.id,
              content: m.content,
              senderId: m.senderId,
              role: m.senderId === currentUser.id ? 'me' : 'them',
              time: m.time || ''
          })) as Message[];
          setMessages(formattedMessages);
      });
      return () => unsubscribe();
  }, [chatId, currentUser.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const content = input.trim();
    setInput('');
    
    // Send to Firestore
    try {
        await sendMessage(chatId, currentUser.id, content);
        
        // --- NOTIFICATION LOGIC ---
        // Send a notification to the OTHER user so they know they got a message.
        // We only do this here to simulate "push" notifications in-app.
        await sendNotification(neighbor.id, {
            title: `Nuovo messaggio da ${currentUser.name}`,
            message: content.length > 30 ? content.substring(0, 30) + "..." : content,
            type: 'info'
        });

    } catch (e) {
        console.error("Failed to send message", e);
    }
  };

  const isInputValid = input.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-[#F3F6FB] animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar pb-4"
      >
        <div className="flex justify-center mb-6">
          <span className="bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">Oggi</span>
        </div>

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'me' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
            <div className={`max-w-[80%] ${m.role === 'me' ? 'bg-indigo-600 text-white rounded-[24px] rounded-tr-sm shadow-md shadow-indigo-100' : 'bg-white text-slate-800 rounded-[24px] rounded-tl-sm shadow-sm border border-slate-100'} p-4`}>
              <p className="text-sm leading-relaxed font-medium">{m.content}</p>
              <div className={`text-[9px] font-bold mt-1 text-right ${m.role === 'me' ? 'text-indigo-200' : 'text-slate-300'}`}>
                {m.time}
              </div>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
            <div className="text-center py-10 opacity-50">
                <p className="text-xs font-bold text-slate-400">Inizia la conversazione con {neighbor.name}</p>
            </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2">
          <button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-xl hover:bg-indigo-50"><Paperclip size={20} /></button>
          <button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-xl hover:bg-indigo-50"><Camera size={20} /></button>
          
          <div className="flex-1 relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Scrivi un messaggio..."
              className="w-full bg-slate-50 rounded-2xl py-3.5 pl-4 pr-12 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white border border-transparent focus:border-indigo-100 transition-all placeholder:text-slate-400 font-medium"
            />
            <button 
              onClick={handleSend}
              disabled={!isInputValid}
              className={`absolute right-1.5 top-1.5 p-2 rounded-xl transition-all active:scale-90 flex items-center justify-center ${isInputValid ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Send size={18} className={isInputValid ? 'ml-0.5' : ''} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
