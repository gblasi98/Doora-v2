import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, User as UserIcon, MessageSquare, Send, Check, ChevronDown, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Box } from 'lucide-react';
import { PackageRequest, RequestStatus, Neighbor, User } from '../types';

interface NewRequestProps {
  onSubmit: (requests: PackageRequest[]) => void;
  user: User;
  neighbors: Neighbor[];
}

const NewRequest: React.FC<NewRequestProps> = ({ onSubmit, user, neighbors }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'neighbor' | 'calendar' | 'timeFrom' | 'timeTo' | null>(null);

  // Helper per formattare data YYYY-MM-DD
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalToday = () => formatDateStr(new Date());

  // LOGICA INIZIALIZZAZIONE DEFAULT (Richiesta utente)
  const getDefaults = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Regola: Se accedo dopo le 19:30, vado a domani
    const isLate = currentHour > 19 || (currentHour === 19 && currentMin >= 30);
    
    let targetDate = new Date(now);
    let defaultTimeFrom = "08:00";

    if (isLate) {
      // Imposta a domani
      targetDate.setDate(targetDate.getDate() + 1);
      // Orario start domani
      defaultTimeFrom = "08:00";
    } else {
      // È oggi. Calcola orario
      if (currentHour < 8) {
        // Se prima delle 8:00
        defaultTimeFrom = "08:00";
      } else {
        // Se tra le 8 e le 19:30, prendi prossimo slot da 30min
        let h = currentHour;
        let m = currentMin < 30 ? 30 : 0;
        if (m === 0) h += 1; // es 9:40 -> start 10:00
        
        defaultTimeFrom = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    return {
      date: formatDateStr(targetDate),
      timeFrom: defaultTimeFrom,
      timeTo: "20:00" // Default fisso richiesto
    };
  };

  const defaults = getDefaults();

  const [deliveryName, setDeliveryName] = useState('Consegna'); // Default Value to ensure grouping works
  const [date, setDate] = useState(defaults.date);
  const [timeFrom, setTimeFrom] = useState(defaults.timeFrom);
  const [timeTo, setTimeTo] = useState(defaults.timeTo);
  const [notes, setNotes] = useState('');
  
  // UI States for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Calendar State
  const initialDateObj = useMemo(() => new Date(date), [date]);
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth());
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear());

  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    return { offset, daysInMonth };
  }, [viewYear, viewMonth]);

  // Sync calendar view when opening
  useEffect(() => {
    if (activeDropdown === 'calendar') {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth());
        setViewYear(d.getFullYear());
      }
    }
  }, [activeDropdown, date]);

  // DATE CHANGE EFFECT: Recalculate default time based on selected date
  useEffect(() => {
    const todayStr = getLocalToday();
    
    if (date > todayStr) {
      // Futuro: Start sempre 08:00
      setTimeFrom("08:00");
    } else if (date === todayStr) {
      // Oggi: Ricalcola slot in base all'ora attuale
      const currentDefaults = getDefaults();
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      
      if (h < 8) {
         setTimeFrom("08:00");
      } else {
         let nextH = h;
         let nextM = m < 30 ? 30 : 0;
         if (nextM === 0) nextH += 1;
         
         // Cap at 20:00 for UI niceness
         if (nextH >= 20) {
             setTimeFrom("20:00"); 
         } else {
             setTimeFrom(`${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
         }
      }
    }
  }, [date]);

  const handleDaySelect = (day: number) => {
    const todayStr = getLocalToday();
    const newDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Allow selection only if >= today (logic handled by disabled prop in render too)
    if (newDate >= todayStr) {
      setDate(newDate);
      setActiveDropdown(null);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); } else { setViewMonth(v => v + 1); }
  };
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); } else { setViewMonth(v => v - 1); }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d} ${monthNames[parseInt(m)-1]} ${y}`;
    } catch(e) { return dateStr; }
  };

  // Genera slot dalle 08:00 alle 20:00
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 8; i <= 20; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      if (i < 20) { // Non generare 20:30
          slots.push(`${i.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  }, []);

  useEffect(() => {
    if (activeDropdown === 'timeFrom') {
      const el = document.getElementById(`time-option-from-${timeFrom}`);
      el?.scrollIntoView({ block: 'center' });
    }
    if (activeDropdown === 'timeTo') {
      const el = document.getElementById(`time-option-to-${timeTo}`);
      el?.scrollIntoView({ block: 'center' });
    }
  }, [activeDropdown, timeFrom, timeTo]);

  const now = new Date();
  const todayStr = getLocalToday();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  const isDateToday = date === todayStr;

  const isTimeDisabled = (timeStr: string) => {
    if (!isDateToday) return false;
    const [h, m] = timeStr.split(':').map(Number);
    if (h < currentHours) return true;
    if (h === currentHours && m < currentMinutes) return true;
    return false;
  };

  const isTimeRangeInvalid = timeFrom >= timeTo;
  const isStartTimeInPast = isTimeDisabled(timeFrom);
  
  const timeError = isTimeRangeInvalid 
    ? "L'orario di fine deve essere dopo l'inizio." 
    : (isStartTimeInPast ? "L'orario di inizio è già passato." : null);

  const toggleNeighbor = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(neighbors.map((n: Neighbor) => n.id));
  const deselectAll = () => setSelectedIds([]);

  const neighborDisplayText = useMemo(() => {
    if (selectedIds.length === 0) return 'Seleziona inquilini...';
    if (selectedIds.length === 1) {
      const n = neighbors.find((n: Neighbor) => n.id === selectedIds[0]);
      return n ? `${n.name} ${n.surname || ''}`.trim() : '';
    }
    return `${selectedIds.length} vicini`;
  }, [selectedIds, neighbors]);

  const isFormValid = useMemo(() => {
    return (
      deliveryName.trim().length > 0 &&
      selectedIds.length > 0 &&
      date >= todayStr &&
      !timeError
    );
  }, [deliveryName, selectedIds, date, todayStr, timeError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setIsSubmitting(true);
    
    // Create the requests payload
    const newRequests: PackageRequest[] = selectedIds.map(id => {
      const neighbor = neighbors.find((n: Neighbor) => n.id === id);
      const fullName = neighbor ? `${neighbor.name} ${neighbor.surname || ''}`.trim() : 'Vicino';
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      return {
        id: Math.random().toString(36).substring(7),
        requesterId: user.id, 
        requesterName: `${user.name} ${user.surname || ''}`.trim(), 
        delegateId: id,
        delegateName: fullName,
        deliveryName: deliveryName.trim(), // Salvataggio del nome consegna
        date,
        timeFrom,
        timeTo,
        notes,
        status: RequestStatus.OUT_PENDING,
        type: 'outgoing',
        code
      };
    });

    // Simulate network delay then submit
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Wait a moment to show the success message, then redirect
      setTimeout(() => {
          onSubmit(newRequests);
      }, 1000);
    }, 800);
  };

  const closeDropdowns = () => setActiveDropdown(null);

  const isNeighborActive = activeDropdown === 'neighbor';
  const isCalendarActive = activeDropdown === 'calendar';
  const isTimeActive = activeDropdown === 'timeFrom' || activeDropdown === 'timeTo';

  return (
    <div className="p-6 pb-20 relative">
      {activeDropdown && <div className="fixed inset-0 z-40" onClick={closeDropdowns} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          
          {/* Delivery Name Input (New) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Box size={16} className="text-indigo-600" />
              Nome Consegna
            </label>
            <input 
              type="text"
              value={deliveryName}
              onChange={(e) => setDeliveryName(e.target.value)}
              placeholder="Es. Pacco Amazon, Scarpe, Libri..."
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
            />
          </div>

          {/* Neighbors Dropdown */}
          <div className={`relative ${isNeighborActive ? 'z-50' : 'z-20'}`}>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <UserIcon size={16} className="text-indigo-600" />
              Scegli i vicini
            </label>
            <div 
              onClick={() => setActiveDropdown(isNeighborActive ? null : 'neighbor')}
              className={`w-full bg-white border rounded-2xl p-4 text-slate-700 flex justify-between items-center cursor-pointer shadow-sm relative z-50 min-w-0 transition-colors ${isNeighborActive ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'}`}
            >
              <span className={`truncate mr-2 ${selectedIds.length === 0 ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                {neighborDisplayText}
              </span>
              <ChevronDown size={20} className={`text-slate-400 transition-transform shrink-0 ${isNeighborActive ? 'rotate-180' : ''}`} />
            </div>

            {isNeighborActive && (
              <div className="absolute z-[60] mt-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b border-slate-100 flex gap-2 bg-slate-50">
                  <button type="button" onClick={selectAll} className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 rounded-lg">Seleziona tutti</button>
                  <button type="button" onClick={deselectAll} className="flex-1 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:bg-slate-100 rounded-lg">Deseleziona tutti</button>
                </div>
                <div className="max-h-60 overflow-y-auto no-scrollbar">
                  {neighbors.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">Nessun vicino trovato.</div>
                  ) : (
                    neighbors.map((n: Neighbor) => (
                      <div key={n.id} onClick={(e) => { e.stopPropagation(); toggleNeighbor(n.id); }} className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-800 truncate">{n.name} {n.surname || ''}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest truncate">Piano {n.floor}, {n.apartment}</span>
                        </div>
                        {selectedIds.includes(n.id) && <Check size={18} className="text-indigo-600 shrink-0" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Calendar Dropdown */}
          <div className={`relative ${isCalendarActive ? 'z-50' : 'z-10'}`}>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Calendar size={16} className="text-indigo-600" />
              Giorno consegna
            </label>
            <div className="relative">
               <button 
                  type="button"
                  onClick={() => setActiveDropdown(isCalendarActive ? null : 'calendar')}
                  className={`w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 flex justify-between items-center shadow-sm transition-all hover:border-indigo-300 active:scale-[0.98] ${isCalendarActive ? 'ring-2 ring-indigo-100 border-indigo-500' : ''}`}
                >
                  <span className="font-bold">{formatDateLabel(date)}</span>
                  <ChevronDown size={20} className={`text-slate-400 transition-transform ${isCalendarActive ? 'rotate-180' : ''}`} />
               </button>

               {isCalendarActive && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[32px] p-6 shadow-2xl z-[70] animate-in slide-in-from-top-2 duration-200 min-w-[300px]">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-base font-black text-slate-800 tracking-tight">{monthNames[viewMonth]} {viewYear}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-all active:scale-90"><ChevronLeft size={18} /></button>
                        <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-all active:scale-90"><ChevronRight size={18} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center mb-3">
                      {daysOfWeek.map(d => <span key={d} className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: calendarGrid.offset }).map((_, i) => <div key={`empty-${i}`} />)}
                      {Array.from({ length: calendarGrid.daysInMonth }).map((_, i) => {
                        const dNum = i + 1;
                        const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
                        const isPast = dStr < getLocalToday(); // Use function to get fresh today string
                        const isSelected = dStr === date;
                        const isToday = dStr === getLocalToday();
                        
                        return (
                          <button 
                            key={dNum}
                            type="button"
                            disabled={isPast}
                            onClick={() => handleDaySelect(dNum)}
                            className={`aspect-square rounded-full text-xs font-bold transition-all flex items-center justify-center relative
                              ${isPast ? 'text-slate-200 cursor-not-allowed' : 'hover:bg-indigo-50 text-slate-600'}
                              ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 !hover:bg-indigo-600 z-10' : ''}
                              ${isToday && !isSelected ? 'border border-indigo-200 text-indigo-600 bg-indigo-50/30' : ''}
                            `}
                          >
                            {dNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
               )}
            </div>
          </div>

          {/* Time Dropdowns */}
          <div className={`grid grid-cols-2 gap-4 relative ${isTimeActive ? 'z-50' : 'z-10'}`}>
            <div className="relative">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <Clock size={16} className="text-indigo-600" />
                Dalle
              </label>
              
              <div 
                onClick={() => setActiveDropdown(activeDropdown === 'timeFrom' ? null : 'timeFrom')}
                className={`w-full bg-white border rounded-2xl p-4 text-slate-700 flex justify-between items-center cursor-pointer shadow-sm min-w-0 transition-colors ${isTimeRangeInvalid || isStartTimeInPast ? 'border-red-300 bg-red-50 text-red-600' : (activeDropdown === 'timeFrom' ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300')}`}
              >
                <span className="font-medium truncate">{timeFrom}</span>
                <ChevronDown size={20} className={`text-slate-400 transition-transform shrink-0 ${activeDropdown === 'timeFrom' ? 'rotate-180' : ''}`} />
              </div>

              {activeDropdown === 'timeFrom' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-[60] max-h-48 overflow-y-auto no-scrollbar animate-in slide-in-from-top-2 duration-200">
                  {timeSlots.map(time => {
                    const disabled = isTimeDisabled(time);
                    return (
                      <div 
                        key={`from-${time}`}
                        id={`time-option-from-${time}`}
                        onClick={() => !disabled && (setTimeFrom(time), setActiveDropdown(null))}
                        className={`p-3 text-sm font-medium border-b border-slate-50 last:border-0 ${disabled ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-indigo-50 cursor-pointer'} ${time === timeFrom ? 'bg-indigo-50 text-indigo-600' : ''}`}
                      >
                        {time}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <Clock size={16} className="text-indigo-600" />
                Alle
              </label>

              <div 
                onClick={() => setActiveDropdown(activeDropdown === 'timeTo' ? null : 'timeTo')}
                className={`w-full bg-white border rounded-2xl p-4 text-slate-700 flex justify-between items-center cursor-pointer shadow-sm min-w-0 transition-colors ${isTimeRangeInvalid ? 'border-red-300 bg-red-50 text-red-600' : (activeDropdown === 'timeTo' ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300')}`}
              >
                <span className="font-medium truncate">{timeTo}</span>
                <ChevronDown size={20} className={`text-slate-400 transition-transform shrink-0 ${activeDropdown === 'timeTo' ? 'rotate-180' : ''}`} />
              </div>

              {activeDropdown === 'timeTo' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-[60] max-h-48 overflow-y-auto no-scrollbar animate-in slide-in-from-top-2 duration-200">
                   {timeSlots.map(time => {
                      const disabled = isTimeDisabled(time);
                      return (
                        <div 
                          key={`to-${time}`}
                          id={`time-option-to-${time}`}
                          onClick={() => !disabled && (setTimeTo(time), setActiveDropdown(null))}
                          className={`p-3 text-sm font-medium border-b border-slate-50 last:border-0 ${disabled ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-indigo-50 cursor-pointer'} ${time === timeTo ? 'bg-indigo-50 text-indigo-600' : ''}`}
                        >
                          {time}
                        </div>
                      );
                   })}
                </div>
              )}
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <MessageSquare size={16} className="text-indigo-600" />
              Note aggiuntive
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dettagli per il ritiro..."
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-h-[100px] resize-none"
            />
          </div>

          {/* Error Display */}
          {timeError && (
             <div className="bg-red-50 p-3 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold animate-pulse">
                <AlertCircle size={16} /> {timeError}
             </div>
          )}
        </div>
        
        {/* Submit Button */}
        <button 
          type="submit"
          disabled={!isFormValid || isSubmitting || isSuccess}
          className={`w-full py-4 rounded-3xl font-black text-lg shadow-xl flex items-center justify-center gap-2 mt-8 transition-all active:scale-95 ${
            isSuccess 
              ? 'bg-green-500 text-white shadow-green-200'
              : (!isFormValid || isSubmitting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700')
          }`}
        >
          {isSuccess ? (
            <>
              <CheckCircle2 size={24} /> Richiesta Inviata!
            </>
          ) : isSubmitting ? (
            'Invio in corso...'
          ) : (
            <>
              Invia Richiesta <Send size={20} />
            </>
          )} 
        </button>
      </form>
    </div>
  );
};

export default NewRequest;