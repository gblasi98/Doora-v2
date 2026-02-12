
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, User, CalendarOff } from 'lucide-react';
import { PackageRequest, RequestStatus } from '../types';

interface CalendarViewProps {
  requests: PackageRequest[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ requests }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // STRICT FILTERING for "Accepted Events" logic
  // Includes: OUT_ACCEPTED, IN_ACCEPTED, COLLECTED, COMPLETED
  // Excludes: OUT_PENDING, OUT_PROPOSAL, IN_CONFIRM, IN_RESPONSE
  const acceptedRequests = useMemo(() => {
    return requests.filter(r => 
      r.status === RequestStatus.OUT_ACCEPTED || 
      r.status === RequestStatus.IN_ACCEPTED ||
      r.status === RequestStatus.COLLECTED ||
      r.status === RequestStatus.COMPLETED
    );
  }, [requests]);

  const activitiesByDay = useMemo(() => {
    const map: Record<number, { outgoing: boolean, incoming: boolean, items: PackageRequest[] }> = {};
    
    acceptedRequests.forEach(req => {
      // Manual parsing of YYYY-MM-DD string to avoid Timezone issues (Dot showing on wrong day)
      // "2024-01-20" -> [2024, 1, 20]
      if (!req.date) return;
      
      const parts = req.date.split('-').map(Number);
      if (parts.length !== 3) return;
      
      const reqYear = parts[0];
      const reqMonth = parts[1] - 1; // Month is 0-indexed in JS Date
      const reqDay = parts[2];

      if (reqYear === year && reqMonth === month) {
        const day = reqDay;
        if (!map[day]) map[day] = { outgoing: false, incoming: false, items: [] };
        
        if (req.type === 'outgoing') map[day].outgoing = true;
        if (req.type === 'incoming') map[day].incoming = true;
        map[day].items.push(req);
      }
    });
    
    return map;
  }, [acceptedRequests, year, month]);

  const selectedDayItems = selectedDay ? activitiesByDay[selectedDay]?.items || [] : [];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden p-5 space-y-6">
      {/* Widget Calendario */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-slate-800 tracking-tight text-lg">
            {monthNames[month]} <span className="text-indigo-600">{year}</span>
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={prevMonth}
              className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-[10px] font-black text-slate-300 uppercase text-center tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const activity = activitiesByDay[dayNum];
            const isSelected = selectedDay === dayNum;
            const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;

            return (
              <button 
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`
                  aspect-square relative flex flex-col items-center justify-center rounded-2xl text-xs font-bold transition-all
                  ${isSelected ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105 z-10' : 'text-slate-600 hover:bg-slate-50'}
                  ${isToday && !isSelected ? 'border-2 border-indigo-100 text-indigo-700' : ''}
                `}
              >
                {dayNum}
                
                {!isSelected && activity && (
                  <div className="absolute bottom-1.5 flex gap-1">
                    {activity.outgoing && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm" />}
                    {activity.incoming && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dettagli Giorno Selezionato */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10">
        {selectedDay && (
          selectedDayItems.length > 0 ? (
            <>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                Dettagli per il {selectedDay} {monthNames[month]}
              </h4>
              {selectedDayItems.map(req => (
                <div 
                  key={req.id} 
                  className={`bg-white p-5 rounded-[32px] border-l-8 shadow-sm flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300 ${req.type === 'outgoing' ? 'border-indigo-500' : 'border-green-500'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${req.type === 'outgoing' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                      {req.type === 'outgoing' ? 'Delegato a Vicino' : 'Ritiro che effettuerai'}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
                      <Clock size={14} className="text-indigo-400" />
                      {req.timeFrom} - {req.timeTo}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl text-indigo-500">
                      <User size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">
                        {req.type === 'outgoing' ? 'RITIRA PER TE:' : 'RICHIEDENTE:'}
                      </p>
                      <h5 className="font-bold text-slate-800">{req.delegateName}</h5>
                    </div>
                  </div>

                  {req.notes && (
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-500 italic">
                      "{req.notes}"
                    </div>
                  )}
                  
                  {/* Status Indicator inside card */}
                  <div className="flex justify-end">
                     <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                        req.status === RequestStatus.COMPLETED ? 'text-green-500 bg-green-50' : 
                        req.status === RequestStatus.COLLECTED ? 'text-purple-500 bg-purple-50' : 
                        'text-slate-400 bg-slate-100'
                     }`}>
                        {req.status}
                     </span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 opacity-50 animate-in fade-in zoom-in duration-300">
               <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                  <CalendarOff size={32} />
               </div>
               <div className="text-center">
                 <p className="text-sm font-bold text-slate-500">Nessun impegno</p>
                 <p className="text-xs text-slate-400">Giornata libera per il {selectedDay} {monthNames[month]}</p>
               </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default CalendarView;
