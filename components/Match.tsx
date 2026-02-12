
import React, { useState } from 'react';
import { Neighbor } from '../types';
import { Star, ShieldCheck, UserPlus, Info, Check, X, ShieldAlert, ScanLine, ScanFace, Clock } from 'lucide-react';

interface MatchProps {
  neighbors: Neighbor[];
  onUpdateStatus: (id: string, status: string) => void;
}

const Match: React.FC<MatchProps> = ({ neighbors, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState<'not_verified' | 'requests' | 'verified'>('not_verified');
  const [verifyingNeighbor, setVerifyingNeighbor] = useState<Neighbor | null>(null);

  // 3. Tab VERIFICATI (Miei):
  // Mostra SOLO chi IO ho verificato completamente (outgoingStatus === 'complete').
  // Non mi interessa se loro hanno verificato me.
  const verifiedNeighbors = neighbors.filter(n => n.outgoingStatus === 'complete');
  
  // 2. Tab RICHIESTE (Da loro verso me):
  // Mostra le richieste in entrata (incomingStatus === 'pending' oppure 'accepted').
  // 'pending': devo accettare/rifiutare.
  // 'accepted': devo mostrare il codice (incomingVerificationCode).
  const tabRequests = neighbors.filter(n => 
    n.incomingStatus === 'pending' || n.incomingStatus === 'accepted'
  );
  
  // 1. Tab DA VERIFICARE (Da me verso loro):
  // Mostra tutti i vicini che NON ho ancora verificato.
  // outgoingStatus === 'none' (nessuna azione)
  // outgoingStatus === 'pending' (in attesa di accettazione)
  // outgoingStatus === 'accepted' (devo verificare codice)
  const tabToVerify = neighbors.filter(n => 
    n.outgoingStatus === 'none' ||
    n.outgoingStatus === 'pending' ||
    n.outgoingStatus === 'accepted'
  );

  const counts = {
    toVerify: tabToVerify.length,
    requests: tabRequests.length,
    verified: verifiedNeighbors.length
  };

  const handleVerifyClick = (neighbor: Neighbor) => {
    setVerifyingNeighbor(neighbor);
  };

  const confirmVerification = () => {
    if (verifyingNeighbor) {
      onUpdateStatus(verifyingNeighbor.id, 'complete');
      setVerifyingNeighbor(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Tab Switcher */}
      <div className="p-4 bg-white border-b border-slate-100 shrink-0">
        <div className="flex p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setActiveTab('not_verified')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${activeTab === 'not_verified' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <span className="text-[9px] font-black uppercase tracking-tighter">DA VERIFICARE</span>
            <span className="text-[8px] font-bold opacity-60">({counts.toVerify})</span>
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all relative ${activeTab === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <span className="text-[9px] font-black uppercase tracking-tighter">RICHIESTE</span>
            <span className="text-[8px] font-bold opacity-60">({counts.requests})</span>
            {tabRequests.some(n => n.incomingStatus === 'pending') && (
              <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('verified')}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${activeTab === 'verified' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            <span className="text-[9px] font-black uppercase tracking-tighter">VERIFICATI</span>
            <span className="text-[8px] font-bold opacity-60">({counts.verified})</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar pb-24">
        {(activeTab === 'not_verified' ? tabToVerify : activeTab === 'requests' ? tabRequests : verifiedNeighbors).map(neighbor => (
          <NeighborCard 
            key={neighbor.id} 
            neighbor={neighbor} 
            onUpdateStatus={onUpdateStatus}
            onVerifyClick={() => handleVerifyClick(neighbor)}
            context={activeTab}
          />
        ))}
        
        {(activeTab === 'not_verified' ? tabToVerify : activeTab === 'requests' ? tabRequests : verifiedNeighbors).length === 0 && (
          <div className="text-center py-20 text-slate-300 font-black text-xs uppercase tracking-widest opacity-40">
            Nessun vicino in questa lista
          </div>
        )}
      </div>

      {/* Verification Modal - Compare solo per chi deve VERIFICARE (Iniziatore, tab not_verified) */}
      {verifyingNeighbor && (
        <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setVerifyingNeighbor(null)}>
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 bg-indigo-50 rounded-[30px] flex items-center justify-center text-indigo-600 mx-auto animate-pulse border-4 border-indigo-100">
               <ScanFace size={40} />
            </div>
            
            <div className="space-y-2">
               <h3 className="text-xl font-black text-slate-800">Verifica Identità</h3>
               <p className="text-sm text-slate-500 font-medium leading-relaxed px-2">
                 Controlla che questo codice appaia sul dispositivo di <span className="text-slate-800 font-bold">{verifyingNeighbor.name}</span>.
               </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Codice Match</p>
              <p className="text-4xl font-black text-slate-800 tracking-[0.2em]">{verifyingNeighbor.verificationCode || '---'}</p>
            </div>

            <div className="space-y-3 pt-2">
              <button 
                onClick={confirmVerification} 
                className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 active:scale-95 transition-all hover:bg-indigo-700"
              >
                <Check size={18} strokeWidth={3} />
                Conferma Identità
              </button>
              <button 
                onClick={() => setVerifyingNeighbor(null)} 
                className="w-full py-4 bg-white border-2 border-slate-100 text-slate-500 rounded-[24px] font-black text-sm active:scale-95 transition-all hover:bg-slate-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NeighborCard: React.FC<{
  neighbor: Neighbor;
  onUpdateStatus: (id: string, status: string) => void;
  onVerifyClick: () => void;
  context: 'not_verified' | 'requests' | 'verified';
}> = ({ neighbor, onUpdateStatus, onVerifyClick, context }) => {
  
  // Helper per renderizzare azioni specifiche
  const renderActions = () => {
    
    // TAB VERIFICATI: Io mi fido di lui
    if (context === 'verified') {
        return (
          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center border border-green-100">
            <ShieldCheck size={24} />
          </div>
        );
    }
    
    // TAB RICHIESTE: Flusso IN ENTRATA (Lui vuole che io mi fidi di lui?)
    // NO, Specifica: "X vuole aggiungerti ai suoi verificati".
    // Quindi: "Lui vuole fidarsi di me".
    if (context === 'requests') {
        const status = neighbor.incomingStatus;

        // A. Richiesta in arrivo -> Accetta/Rifiuta
        if (status === 'pending') {
            return (
                <div className="flex gap-2">
                  <button 
                    onClick={() => onUpdateStatus(neighbor.id, 'accepted')}
                    className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all hover:bg-indigo-700"
                  >
                    <Check size={20} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(neighbor.id, 'none')}
                    className="w-11 h-11 bg-white text-red-500 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm active:scale-90 transition-all hover:bg-red-50"
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>
            );
        }
        // B. Ho accettato -> Mostra Codice a Lui
        if (status === 'accepted') {
            return (
                <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 flex flex-col items-center shadow-sm animate-in zoom-in duration-300">
                  <span className="text-[7px] font-black text-indigo-300 uppercase tracking-tighter">MOSTRA CODICE</span>
                  <span className="text-xs font-black text-slate-800 tracking-widest">{neighbor.incomingVerificationCode || '---'}</span>
                </div>
            );
        }
    }

    // TAB DA VERIFICARE: Flusso IN USCITA (Io voglio fidarmi di lui)
    if (context === 'not_verified') {
        const status = neighbor.outgoingStatus;

        // C. Lui ha accettato la mia richiesta -> Devo Verificare
        if (status === 'accepted') {
             return (
                <div className="flex flex-col items-end gap-2 animate-in slide-in-from-right-4 duration-500">
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-100 flex flex-col items-center shadow-sm">
                    <span className="text-[7px] font-black text-indigo-300 uppercase tracking-tighter">CODICE</span>
                    <span className="text-xs font-black text-slate-800 tracking-widest">{neighbor.verificationCode || '---'}</span>
                  </div>
                  <button 
                    onClick={onVerifyClick}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-100 active:scale-95 transition-all hover:bg-indigo-700 flex items-center gap-1"
                  >
                    <ScanLine size={12} /> VERIFICA
                  </button>
                </div>
             );
        }

        // D. Ho inviato richiesta -> In Attesa
        if (status === 'pending') {
             return (
                <div className="flex flex-col items-center">
                   <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 flex items-center gap-1">
                     <Clock size={10} /> IN ATTESA
                   </span>
                </div>
             );
        }

        // E. Default (none) -> UserPlus (Avvia il processo Outgoing)
        return (
            <button 
              onClick={() => onUpdateStatus(neighbor.id, 'pending')}
              className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-90"
            >
              <UserPlus size={24} strokeWidth={2.5} />
            </button>
        );
    }

    return null;
  };

  return (
    <div className={`bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md`}>
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 relative border-2 border-white shadow-sm shrink-0 overflow-hidden">
        <span className="text-2xl font-black">{neighbor.name[0]}</span>
        {/* Mostra badge verde SOLO se IO l'ho verificato */}
        {neighbor.outgoingStatus === 'complete' && (
          <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full border-2 border-white">
            <Check size={10} strokeWidth={4} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-black text-slate-800 text-base truncate">{neighbor.name}</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{neighbor.apartment} • PIANO {neighbor.floor}</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg">
            <Star size={10} fill="currentColor" /> {neighbor.rating}
          </span>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
            {neighbor.packages} PACCHI
          </span>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end min-w-[50px]">
        {renderActions()}
      </div>
    </div>
  );
};

export default Match;
