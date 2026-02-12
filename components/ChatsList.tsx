
import React, { useState, useEffect } from 'react';
import { Neighbor, User } from '../types';
import { Search, ChevronRight, Ghost, MessageSquarePlus } from 'lucide-react';
import { subscribeToActiveChats } from '../services/firebase';

interface ChatsListProps {
  onSelectNeighbor: (neighborId: string) => void;
  currentUser: User;
  neighbors: Neighbor[];
}

const ChatsList: React.FC<ChatsListProps> = ({ onSelectNeighbor, currentUser, neighbors }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to real active chats from Firestore
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToActiveChats(currentUser.id, (chats) => {
        setActiveChats(chats);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Logic: 
  // 1. If searching, search through ALL neighbors (to start a new chat).
  // 2. If NOT searching, show ACTIVE chats history.

  const isSearching = searchTerm.trim().length > 0;

  // Filter neighbors for Search Mode
  const searchResults = neighbors.filter(neighbor => 
    neighbor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    neighbor.apartment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Process Active Chats to attach neighbor details
  const displayChats = activeChats.map(chat => {
      // The other person is the ID in participants that is NOT me
      const otherId = chat.participants.find((id: string) => id !== currentUser.id);
      const neighborDetails = neighbors.find(n => n.id === otherId);
      
      // If neighbor deleted account or not found, fallback
      const displayName = neighborDetails ? neighborDetails.name : 'Utente sconosciuto';
      const displayInitial = displayName[0];
      
      // Calculate time relative
      let timeDisplay = '';
      if (chat.lastMessageTime) {
          const d = new Date(chat.lastMessageTime.seconds * 1000);
          timeDisplay = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }

      return {
          id: chat.id,
          neighborId: otherId,
          displayName,
          displayInitial,
          lastMessage: chat.lastMessage,
          timeDisplay
      };
  });

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-5 bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="relative">
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca inquilino per chattare..." 
            className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isSearching ? (
           // SEARCH MODE
           <>
             <div className="px-5 py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Risultati ricerca</div>
             {searchResults.length > 0 ? (
                searchResults.map(neighbor => (
                    <button 
                    key={neighbor.id}
                    onClick={() => onSelectNeighbor(neighbor.id)}
                    className="w-full flex items-center gap-4 p-5 hover:bg-slate-100/50 transition-colors border-b border-slate-50 group bg-white"
                    >
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg border-2 border-white shadow-sm shrink-0">
                        {neighbor.name[0]}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <h4 className="font-bold text-slate-800 truncate">{neighbor.name}</h4>
                        <p className="text-xs text-slate-400 truncate font-medium">Piano {neighbor.floor}, {neighbor.apartment}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-400 transition-colors shrink-0" />
                    </button>
                ))
             ) : (
                <div className="p-10 text-center text-slate-400 text-sm">Nessun vicino trovato.</div>
             )}
           </>
        ) : (
           // HISTORY MODE
           <>
             {displayChats.length > 0 ? (
                displayChats.map(chat => (
                    <button 
                    key={chat.id}
                    onClick={() => chat.neighborId && onSelectNeighbor(chat.neighborId)}
                    className="w-full flex items-center gap-4 p-5 hover:bg-slate-100/50 transition-colors border-b border-slate-50 group bg-white animate-in fade-in slide-in-from-bottom-2"
                    >
                    <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xl border-2 border-white shadow-sm shrink-0">
                        {chat.displayInitial}
                    </div>
                    
                    <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                        <h4 className="font-bold text-slate-800 truncate">{chat.displayName}</h4>
                        <span className="text-[10px] text-slate-300 font-bold">{chat.timeDisplay}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate font-medium">
                        {chat.lastMessage}
                        </p>
                    </div>

                    <ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-400 transition-colors shrink-0" />
                    </button>
                ))
             ) : (
                <div className="flex flex-col items-center justify-center py-20 px-10 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <MessageSquarePlus size={32} />
                    </div>
                    <p className="text-slate-500 font-bold text-sm">Nessuna chat recente</p>
                    <p className="text-slate-400 text-xs mt-1 max-w-[200px] mx-auto">Cerca un vicino usando la barra in alto per iniziare una conversazione.</p>
                </div>
             )}
           </>
        )}
      </div>
    </div>
  );
};

export default ChatsList;
