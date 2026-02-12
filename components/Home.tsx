
import React, { useMemo } from 'react';
import { Package, ClipboardList, History, BarChart3, Users, AlertCircle, MapPin } from 'lucide-react';
import { AppScreen, User, PackageRequest, Neighbor, RequestStatus } from '../types';

interface HomeProps {
  setScreen: (screen: AppScreen) => void;
  onOpenHistory: () => void;
  onOpenStatus?: () => void;
  user: User;
  requests: PackageRequest[];
  neighbors: Neighbor[];
  unseenHistoryCount: number;
  unseenRequestCount?: number;
  unseenMatchCount?: number;
}

const Home: React.FC<HomeProps> = ({ setScreen, onOpenHistory, onOpenStatus, user, requests, neighbors, unseenHistoryCount, unseenRequestCount, unseenMatchCount }) => {
  const activeRequestsCount = useMemo(() => {
    if (!requests) return 0;
    return requests.filter(r => r.status !== RequestStatus.COMPLETED).length;
  }, [requests]);

  const handleStatusClick = () => {
    if (onOpenStatus) {
      onOpenStatus();
    } else {
      setScreen(AppScreen.STATUS);
    }
  };

  const handleMatchClick = () => {
    setScreen(AppScreen.MATCH);
  };

  if (!user || !user.name) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-400">
           <AlertCircle size={32} />
        </div>
        <div>
          <p className="font-bold text-slate-700">Profilo non disponibile</p>
          <p className="text-xs mt-1">Si è verificato un errore nel caricamento dei dati.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 pb-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between mb-2">
        <div>
           <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">Bentornato,</p>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight">{user.name} 👋</h2>
           <div className="flex items-center gap-1 mt-1 text-slate-500 text-xs font-medium bg-white px-2 py-1 rounded-lg border border-slate-100 inline-flex shadow-sm">
              <MapPin size={12} className="text-indigo-500" />
              {user.address} • Piano {user.floor} • {user.apartment}
           </div>
        </div>
        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-lg border-2 border-white shadow-sm">
           {user.name[0]}{user.surname[0]}
        </div>
      </div>

      <div 
        onClick={() => setScreen(AppScreen.NEW_REQUEST)}
        className="group relative overflow-hidden bg-slate-900 rounded-[32px] p-6 text-white shadow-xl shadow-slate-200 cursor-pointer transition-all active:scale-[0.98]"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl -mr-10 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex items-center gap-5">
          <div className="bg-white/10 p-4 rounded-[20px] backdrop-blur-md shadow-inner ring-1 ring-white/10 shrink-0">
            <Package size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black mb-1 tracking-tight">Nuova Richiesta</h3>
            <p className="text-slate-300 text-xs font-medium leading-relaxed">
              Delega il ritiro di un pacco in arrivo.
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center">
             <span className="font-bold text-lg leading-none mb-0.5">+</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MenuCard 
          icon={<ClipboardList className="text-orange-500" size={24} />} 
          title="Stato" 
          subtitle="Attive"
          badgeCount={unseenRequestCount}
          badgeColor="bg-orange-500"
          onClick={handleStatusClick}
        />
        <MenuCard 
          icon={<Users className="text-pink-500" size={24} />} 
          title="Vicini" 
          subtitle="Match"
          badgeCount={unseenMatchCount}
          badgeColor="bg-pink-500"
          onClick={handleMatchClick}
        />
        <MenuCard 
          icon={<History className="text-blue-500" size={24} />} 
          title="Storico" 
          subtitle="Passate"
          badgeCount={unseenHistoryCount}
          badgeColor="bg-blue-500"
          onClick={onOpenHistory}
        />
        <MenuCard 
          icon={<BarChart3 className="text-green-500" size={24} />} 
          title="Stats" 
          subtitle="Impatto"
          onClick={() => setScreen(AppScreen.STATS)}
        />
      </div>
    </div>
  );
};

interface MenuCardProps { 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  onClick: () => void; 
  badgeCount?: number; 
  badgeColor?: string; 
}

const MenuCard = ({ icon, title, subtitle, onClick, badgeCount, badgeColor }: MenuCardProps) => (
  <button 
    onClick={onClick}
    className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex flex-col items-start gap-4 hover:bg-slate-50 transition-all active:scale-95 relative overflow-visible group h-32 justify-between"
  >
    <div className="w-full flex justify-between items-start">
        <div className="p-2.5 bg-slate-50 rounded-[18px] group-hover:bg-white group-hover:shadow-sm transition-colors">
            {icon}
        </div>
        {badgeCount !== undefined && badgeCount > 0 && (
            <div className={`w-6 h-6 ${badgeColor || 'bg-red-500'} text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-sm`}>
                {badgeCount}
            </div>
        )}
    </div>
    
    <div className="flex flex-col items-start">
      <span className="font-black text-slate-800 text-sm tracking-tight">{title}</span>
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide group-hover:text-indigo-500 transition-colors">{subtitle}</span>
    </div>
  </button>
);

export default Home;
