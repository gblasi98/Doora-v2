
import React, { useState, useMemo } from 'react';
import { Package, User, Star, PackageOpen, Inbox, Smile } from 'lucide-react';
import { PackageRequest } from '../types';

interface HistoryProps {
  onBack: () => void;
  requests: PackageRequest[];
  onRate: (id: string, rating: number) => void;
}

const History: React.FC<HistoryProps> = ({ onBack, requests, onRate }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'requests' | 'pickups'>('all');

  // Use the props instead of mock data
  const filteredHistory = useMemo(() => {
    if (activeFilter === 'requests') return requests.filter(h => h.type === 'outgoing');
    if (activeFilter === 'pickups') return requests.filter(h => h.type === 'incoming');
    return requests;
  }, [activeFilter, requests]);

  const counts = {
    all: requests.length,
    requests: requests.filter(h => h.type === 'outgoing').length,
    pickups: requests.filter(h => h.type === 'incoming').length,
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* L'header è gestito dal Layout principale */}

      {/* Tab Switcher - Stile unificato con Match.tsx */}
      <div className="p-4 bg-white border-b border-slate-100 shrink-0">
        <div className="flex p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${activeFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <span className="text-[9px] font-black uppercase tracking-tighter">TUTTE</span>
            <span className="text-[8px] font-bold opacity-60">({counts.all})</span>
          </button>
          <button 
            onClick={() => setActiveFilter('requests')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${activeFilter === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <span className="text-[9px] font-black uppercase tracking-tighter">RICHIESTE</span>
            <span className="text-[8px] font-bold opacity-60">({counts.requests})</span>
          </button>
          <button 
            onClick={() => setActiveFilter('pickups')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${activeFilter === 'pickups' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <span className="text-[9px] font-black uppercase tracking-tighter">RITIRI</span>
            <span className="text-[8px] font-bold opacity-60">({counts.pickups})</span>
          </button>
        </div>
      </div>

      {/* Lista Card */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-24">
        {filteredHistory.map(item => (
          <HistoryCard 
            key={item.id} 
            request={item} 
            onRate={(rating) => onRate(item.id, rating)} 
          />
        ))}
        {filteredHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
              {activeFilter === 'requests' ? <PackageOpen size={32} /> : activeFilter === 'pickups' ? <Inbox size={32} /> : <Package size={32} />}
            </div>
            <p className="text-slate-500 font-bold text-sm">Nessuna consegna trovata</p>
            <p className="text-xs text-slate-400 mt-1">
              {activeFilter === 'requests' ? "Non hai ancora delegato nessun pacco." : activeFilter === 'pickups' ? "Non hai ancora ritirato pacchi per altri." : "Il tuo storico è vuoto."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface HistoryCardProps {
  request: PackageRequest;
  onRate: (rating: number) => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ request, onRate }) => {
  const isOutgoing = request.type === 'outgoing';
  const accentColor = isOutgoing ? 'border-indigo-500' : 'border-green-500';
  const badgeBg = isOutgoing ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600';
  const badgeLabel = isOutgoing ? 'DELEGATO' : 'RITIRATO';
  const [hoverRating, setHoverRating] = useState(0);
  const [justRated, setJustRated] = useState(false);

  // Se io ho mandato la richiesta (outgoing), vedo il nome del delegato.
  // Se io ho ricevuto la richiesta (incoming/delegato), vedo il nome del richiedente.
  const displayName = isOutgoing ? request.delegateName : (request.requesterName || "Vicino");

  const hasRating = request.rating !== undefined && request.rating !== null;

  const handleRatingClick = (star: number) => {
    onRate(star);
    setJustRated(true);
    // Ripristina la visualizzazione delle stelle dopo 2 secondi
    setTimeout(() => {
      setJustRated(false);
    }, 2000);
  };

  return (
    <div className={`bg-white rounded-[32px] p-5 shadow-sm border-l-4 ${accentColor} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className="flex justify-between items-center mb-4">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${badgeBg}`}>
          {isOutgoing ? <Package size={12} /> : <span>🤝</span>} {badgeLabel}
        </div>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{request.date}</span>
      </div>

      <div className="flex justify-end items-center mb-4">
        <div className="flex items-center gap-3">
           <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">{isOutgoing ? 'RITIRATO DA:' : 'PER:'}</span>
            <span className="font-bold text-slate-700 text-sm">{displayName}</span>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold border-2 border-white shadow-sm">
            {displayName[0]}
          </div>
        </div>
      </div>

      {/* Sezione Rating centrate */}
      <div className="flex flex-col items-center justify-center pt-3 border-t border-slate-50 relative min-h-[40px]">
        {justRated ? (
           <div className="flex items-center gap-2 animate-in zoom-in duration-500 text-green-500 font-bold text-sm">
              <Smile size={20} /> Grazie del feedback!
           </div>
        ) : (
          // Se ho delegato (OUTGOING) e non c'è voto, mostro le stelle interattive
          isOutgoing && !hasRating ? (
            <div className="text-center space-y-2 py-1 animate-in fade-in duration-500">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Valuta la consegna</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star} 
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRatingClick(star)}
                    className="transition-transform active:scale-75 hover:scale-125 focus:outline-none"
                  >
                    <Star 
                      size={24} 
                      fill={(hoverRating || 0) >= star ? "#f59e0b" : "none"} 
                      className={(hoverRating || 0) >= star ? "text-amber-500 drop-shadow-sm" : "text-slate-200"} 
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : hasRating ? (
            // Se c'è già il voto, mostro le stelle statiche
            <div className="flex items-center gap-2 animate-in zoom-in duration-300">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={18} 
                    fill={star <= (request.rating || 0) ? "#f59e0b" : "none"} 
                    className={star <= (request.rating || 0) ? "text-amber-500" : "text-slate-200"} 
                  />
                ))}
              </div>
              <span className="text-lg font-black text-amber-500">{(request.rating || 0).toFixed(1)}</span>
            </div>
          ) : (
            // Se ho ritirato (INCOMING) e non c'è voto, mostro solo testo
            <div className="py-2">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">In attesa di valutazione</span>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default History;
