
import React, { useMemo, useEffect, useState } from 'react';
import { USER_LEVELS, LevelDef, calculateUserLevel } from '../constants';
import { User } from '../types';
import { Trophy, Star, TrendingUp, Package, Handshake, MapPin, Calendar, Timer, CheckCircle2, Users, MessageCircle, BarChart3, Lock } from 'lucide-react';
import { subscribeToLeaderboard, updateUserProfile } from '../services/firebase';

interface StatsProps {
  user: User;
}

const Stats: React.FC<StatsProps> = ({ user }) => {
  const [leaderboard, setLeaderboard] = useState<User[]>([]);

  useEffect(() => {
    const unsub = subscribeToLeaderboard(user, (users) => {
       setLeaderboard(users);
    });
    return () => unsub();
  }, [user]);

  // Calcolo Livello Dinamico basato sulle statistiche attuali
  const realLevel = useMemo(() => calculateUserLevel(user), [user]);
  
  // Effetto per sincronizzare il livello nel DB se è cambiato
  useEffect(() => {
    if (user.level !== realLevel) {
        updateUserProfile(user.id, { level: realLevel }).catch(console.error);
    }
  }, [realLevel, user.level, user.id]);

  const currentLevelDef = USER_LEVELS.find(l => l.level === realLevel) || USER_LEVELS[0];
  const nextLevelDef = USER_LEVELS.find(l => l.level === realLevel + 1);

  // Calcolo Progresso Verso il Prossimo Livello
  const progressData = useMemo(() => {
    if (!nextLevelDef) return null; // Livello Max Raggiunto

    const req = nextLevelDef.req;
    const requirements = [];
    let totalProgress = 0;

    // Helper per calcolare % singola metrica
    const calc = (current: number, target: number) => Math.min(100, (current / target) * 100);

    // 1. Total Packages
    if (req.totalPackages) {
       const current = (user.packagesCollected || 0) + (user.packagesDelegated || 0);
       requirements.push({
         label: "Pacchi Totali (Ritirati + Delegati)",
         current,
         target: req.totalPackages,
         percent: calc(current, req.totalPackages),
         icon: <Package size={14} />
       });
    }

    // 2. Collected
    if (req.collected) {
       const current = user.packagesCollected || 0;
       requirements.push({
         label: "Pacchi Ritirati",
         current,
         target: req.collected,
         percent: calc(current, req.collected),
         icon: <Handshake size={14} />
       });
    }

    // 3. Delegated
    if (req.delegated) {
       const current = user.packagesDelegated || 0;
       requirements.push({
         label: "Pacchi Delegati",
         current,
         target: req.delegated,
         percent: calc(current, req.delegated),
         icon: <Package size={14} />
       });
    }

    // 4. Feedbacks
    if (req.feedbacks) {
        const current = user.feedbacksReceived || 0;
        requirements.push({
          label: "Feedback Ricevuti",
          current,
          target: req.feedbacks,
          percent: calc(current, req.feedbacks),
          icon: <MessageCircle size={14} />
        });
    }

    // 5. Rating
    if (req.rating) {
        const current = user.rating || 0;
        requirements.push({
          label: "Rating Medio",
          current,
          target: req.rating,
          percent: calc(current, req.rating),
          icon: <Star size={14} />
        });
    }

    // Calcolo progresso globale (media delle % dei requisiti)
    if (requirements.length > 0) {
        const sumPercent = requirements.reduce((acc, curr) => acc + curr.percent, 0);
        totalProgress = sumPercent / requirements.length;
    }

    return {
        nextLevelName: nextLevelDef.name,
        requirements,
        totalProgress
    };
  }, [user, nextLevelDef, realLevel]);

  // Podio e Resto della Classifica
  const podium = [leaderboard[1], leaderboard[0], leaderboard[2]]; // 2°, 1°, 3°
  const restOfList = leaderboard.slice(3);
  const userRank = leaderboard.findIndex(u => u.id === user.id) + 1;

  return (
    <div className="pb-24 bg-slate-50 min-h-full">
      {/* Sezione Hero Stile Silver (Simile al Profilo) */}
      <section className="bg-gradient-to-b from-slate-200 via-slate-100 to-white p-8 pt-10 text-slate-800 rounded-b-[48px] shadow-sm relative overflow-hidden border-b border-slate-200">
        {/* Decorazioni sfondo */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/40 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-slate-300/20 rounded-full blur-3xl -ml-10 -mb-10"></div>

        <div className="flex flex-col items-center relative z-10">
          {/* Icona Trofeo nel riquadro */}
          <div className="w-24 h-24 bg-white rounded-[32px] border-4 border-white flex items-center justify-center shadow-xl overflow-hidden mb-4 text-amber-500">
             <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                <Trophy size={40} fill="currentColor" className="drop-shadow-sm" />
             </div>
          </div>
          
          {/* Titolo Rank e Livello */}
          <h2 className="text-3xl font-black tracking-tight text-slate-800 mb-2">{currentLevelDef.name}</h2>
          <div className="px-5 py-1.5 bg-slate-800 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200">
            Livello {realLevel}
          </div>

          {/* Griglia Card Riepilogo integrata nella sezione silver */}
          <div className="grid grid-cols-2 gap-3 w-full mt-8">
            <StatCard icon={<Package size={18} className="text-indigo-500" />} value={user.packagesDelegated} label="Pacchi Delegati" />
            <StatCard icon={<Handshake size={18} className="text-emerald-500" />} value={user.packagesCollected} label="Pacchi Ritirati" />
            <StatCard icon={<Star size={18} className="text-amber-500" />} value={user.rating} label="Rating medio" />
            <StatCard icon={<MapPin size={18} className="text-rose-500" />} value={`${userRank > 0 ? userRank : '-'}`} label="Posizione" />
          </div>
        </div>
      </section>

      <div className="p-6 space-y-10 bg-slate-50 relative z-20 mt-2">
        
        {/* PROSSIMO LIVELLO */}
        {progressData ? (
            <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-black text-slate-800 px-2 text-lg uppercase tracking-tight">
                  <span className="text-xl">🚀</span> Prossimo Obiettivo
                </h3>
                <div className="bg-white rounded-[40px] p-6 shadow-xl shadow-indigo-100/30 border border-slate-100 overflow-hidden relative">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Livello {realLevel + 1}</p>
                            <h4 className="text-xl font-black text-slate-800 tracking-tight">{progressData.nextLevelName}</h4>
                        </div>
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Lock size={20} />
                        </div>
                    </div>

                    {/* Progress Bar Globale */}
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-6">
                         <div 
                           className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" 
                           style={{ width: `${progressData.totalProgress}%` }} 
                         />
                    </div>

                    {/* Lista Requisiti */}
                    <div className="space-y-3">
                        {progressData.requirements.map((req, idx) => (
                             <div key={idx} className="flex flex-col gap-1">
                                <div className="flex justify-between items-center text-xs">
                                   <div className="flex items-center gap-2 font-bold text-slate-600">
                                      {req.icon} {req.label}
                                   </div>
                                   <div className="font-black text-slate-800">
                                      {req.current} / <span className="text-slate-400">{req.target}</span>
                                   </div>
                                </div>
                                <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                                     <div 
                                       className={`h-full rounded-full transition-all duration-700 ${req.percent >= 100 ? 'bg-green-500' : 'bg-slate-300'}`}
                                       style={{ width: `${req.percent}%` }}
                                     />
                                </div>
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        ) : (
             <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-[40px] p-8 text-center border border-amber-200">
                 <Trophy size={48} className="text-amber-500 mx-auto mb-4" />
                 <h3 className="text-2xl font-black text-amber-800 mb-2">Livello Massimo!</h3>
                 <p className="text-amber-700 font-bold text-sm">Sei una leggenda del vicinato. Grazie per il tuo contributo incredibile!</p>
             </div>
        )}

        {/* Classifica Condominio */}
        <div className="space-y-4">
          <div className="px-2">
            <h3 className="flex items-center gap-2 font-black text-slate-800 text-lg uppercase tracking-tight">
              <span className="text-xl">🏠</span> Classifica Condominio
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{user.address}, {user.city}</p>
          </div>

          <div className="bg-white rounded-[40px] p-6 shadow-xl shadow-indigo-100/20 border border-slate-100">
             {leaderboard.length < 3 ? (
                 <div className="space-y-2">
                    {leaderboard.map((item, idx) => <LeaderboardRow key={item.id} rank={idx + 1} item={item} currentUserId={user.id} />)}
                 </div>
             ) : (
                <>
                  {/* Podio */}
                  <div className="flex items-end justify-center gap-2 mb-8 mt-4">
                    {podium[0] && <PodiumSpot item={podium[0]} rank={2} height="h-32" color="bg-slate-300" medal="🥈" />}
                    {podium[1] && <PodiumSpot item={podium[1]} rank={1} height="h-40" color="bg-amber-400" medal="🥇" />}
                    {podium[2] && <PodiumSpot item={podium[2]} rank={3} height="h-28" color="bg-amber-700" medal="🥉" />}
                  </div>

                  {/* Resto della Classifica */}
                  <div className="space-y-2">
                    {restOfList.map((item, idx) => (
                      <LeaderboardRow key={item.id} rank={idx + 4} item={item} currentUserId={user.id} />
                    ))}
                  </div>
                </>
             )}
          </div>
        </div>

        {/* Sezione Dettagli */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-black text-slate-800 px-2 text-lg uppercase tracking-tight">
            <span className="text-xl">📊</span> Dettagli
          </h3>
          <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 divide-y divide-slate-50">
            <DetailRow icon={<Calendar size={18} className="text-indigo-400" />} label="Membro da" value={user.memberSince ?? 'N/A'} />
            <DetailRow icon={<Package size={18} className="text-amber-600" />} label="Media consegne/mese" value={user.avgPackagesMonth ?? 0} />
            <DetailRow icon={<Timer size={18} className="text-purple-500" />} label="Tempo medio risposta" value={user.avgResponseTime ?? 'N/A'} />
            <DetailRow icon={<CheckCircle2 size={18} className="text-green-500" />} label="Tasso completamento" value={user.completionRate ?? 'N/A'} />
            <DetailRow icon={<Users size={18} className="text-blue-500" />} label="Vicini aiutati" value={user.neighborsHelped ?? 0} />
            <DetailRow icon={<MessageCircle size={18} className="text-pink-400" />} label="Feedback ricevuti" value={user.feedbacksReceived ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, value: string | number, label: string }> = ({ icon, value, label }) => (
  <div className="bg-white p-4 rounded-[28px] border border-slate-100 flex flex-col items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
    <div className="mb-0.5">{icon}</div>
    <div className="text-2xl font-black text-slate-800 leading-none tracking-tight">{value}</div>
    <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-center">{label}</div>
  </div>
);

const PodiumSpot: React.FC<{ item: User, rank: number, height: string, color: string, medal: string }> = ({ item, rank, height, color, medal }) => (
  <div className="flex flex-col items-center flex-1 max-w-[90px]">
    <div className="relative mb-2">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-lg border-2 border-white shadow-sm overflow-hidden">
        {item.name[0]}
      </div>
      <div className="absolute -top-2 -right-2 text-lg drop-shadow-sm">{medal}</div>
    </div>
    <div className={`w-full ${height} ${color} rounded-2xl flex flex-col items-center justify-start pt-4 shadow-lg`}>
      <span className="text-white font-black text-sm">{rank}°</span>
      <div className="mt-auto pb-4 text-center px-1">
        <p className="text-[10px] font-black text-white/90 truncate w-full">{item.name}</p>
        <p className="text-[12px] font-black text-white">{(item.packagesCollected || 0) + (item.packagesDelegated || 0)}</p>
        <p className="text-[7px] font-black text-white/60 uppercase tracking-tighter">pacchi</p>
      </div>
    </div>
  </div>
);

const LeaderboardRow: React.FC<{ rank: number, item: User, currentUserId: string }> = ({ rank, item, currentUserId }) => {
    const isMe = item.id === currentUserId;
    const score = (item.packagesCollected || 0) + (item.packagesDelegated || 0);
    return (
      <div className={`flex items-center gap-4 p-4 rounded-3xl transition-all ${isMe ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-slate-50 border border-transparent'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${isMe ? 'text-indigo-600' : 'text-slate-400'}`}>
          {rank}
        </div>
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 font-bold shrink-0 shadow-sm">
          {item.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-black truncate ${isMe ? 'text-indigo-900' : 'text-slate-800'}`}>
            {item.name} {item.surname}
          </h4>
          <p className="flex items-center gap-1 text-[9px] font-bold text-amber-500">
            <Star size={10} fill="currentColor" /> {item.rating || 5.0}
          </p>
        </div>
        <div className={`text-lg font-black ${isMe ? 'text-indigo-600' : 'text-slate-700'}`}>{score}</div>
      </div>
    );
};

const DetailRow: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
      <span className="text-sm font-bold text-slate-600">{label}</span>
    </div>
    <span className="text-sm font-black text-slate-800">{value}</span>
  </div>
);

export default Stats;
