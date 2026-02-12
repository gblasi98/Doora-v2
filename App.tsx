import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppScreen, PackageRequest, Neighbor, AppNotification, RequestStatus, User, HistoryEvent } from './types';
import Layout from './components/Layout';
import Home from './components/Home';
import NewRequest from './components/NewRequest';
import Status from './components/Status';
import Match from './components/Match';
import Stats from './components/Stats';
import History from './components/History';
import AIAssistant from './components/AIAssistant';
import CalendarView from './components/CalendarView';
import ChatsList from './components/ChatsList';
import ChatRoom from './components/ChatRoom';
import Profile from './components/Profile';
import { Mail, Lock, ChevronLeft, Eye, EyeOff, Camera, MapPin, Phone, User as UserIcon, Home as HomeIcon, Info, X, ShieldCheck, Bell, CheckCircle2, ShieldAlert, PackageCheck, AlertCircle, Loader2, Package, Trash2 } from 'lucide-react';

// Firebase Services
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, arrayUnion } from 'firebase/firestore'; // Added arrayUnion
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  subscribeToRequests, 
  createPackageRequest, 
  updateRequestStatus, 
  deletePackageRequest,
  subscribeToNeighbors,
  subscribeToMatches,
  createMatchRequest, 
  updateMatchStatus, 
  updateRequestDetails,
  updateUserProfile,
  subscribeToNotifications,
  sendNotification,
  markNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications
} from './services/firebase';

// Interfaces for Real Address Data
interface CityData {
  nome: string;
  sigla: string; // Provincia
  cap: string[];
}

// Helper per formattare data nei log (es. 2026-03-08 -> 8 Febbraio)
const formatDateForLog = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const day = date.getDate();
    const month = date.toLocaleDateString('it-IT', { month: 'long' });
    // Capitalize month
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} ${monthCap}`;
  } catch (e) {
    return dateStr;
  }
};

const AutocompleteInput = ({ icon: Icon, value, onChange, onSelect, options, placeholder, renderOption, zIndex = "z-20", isLoading = false, hasError = false }: any) => {
  const [showOptions, setShowOptions] = useState(false);
  
  return (
    <div className={`relative ${zIndex}`}>
       <div className="relative">
          <input 
            value={value}
            onChange={(e) => { onChange(e.target.value); setShowOptions(true); }}
            onFocus={() => setShowOptions(true)}
            onBlur={() => setTimeout(() => setShowOptions(false), 200)}
            placeholder={placeholder}
            className={`w-full bg-white border ${hasError ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-200 focus:border-indigo-500'} rounded-2xl p-3.5 ${Icon ? 'pl-11' : 'pl-4'} transition-all outline-none text-slate-700 placeholder-slate-400 text-sm shadow-sm`} 
          />
          {Icon ? (
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
          ) : null}
          {isLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="text-indigo-400 animate-spin" size={16} />
            </div>
          )}
       </div>
       
       {showOptions && value.length > 0 && options.length > 0 && (
         <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto no-scrollbar z-50">
           {options.map((opt: any, i: number) => (
             <div 
               key={i} 
               onMouseDown={(e) => { e.preventDefault(); onSelect(opt); setShowOptions(false); }}
               className="p-3 text-sm text-slate-700 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0"
             >
               {renderOption ? renderOption(opt) : (typeof opt === 'string' ? opt : opt.nome)}
             </div>
           ))}
         </div>
       )}
    </div>
  );
};

const SolidInput = ({ icon: Icon, onEnter, hasError = false, ...props }: any) => (
  <div className="relative">
    <input 
      {...props} 
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onEnter) onEnter();
        if (props.onKeyDown) props.onKeyDown(e);
      }}
      className={`w-full bg-white border ${hasError ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-200 focus:border-indigo-500'} rounded-2xl p-3.5 ${Icon ? 'pl-11' : 'pl-4'} transition-all outline-none text-slate-700 placeholder-slate-400 text-sm shadow-sm`} 
    />
    {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />}
  </div>
);

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<AppScreen>(AppScreen.WELCOME);
  
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<PackageRequest[]>([]); // Active requests
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  
  const [history, setHistory] = useState<PackageRequest[]>([]); // Completed requests

  const [isLoading, setIsLoading] = useState(true);
  
  // Notification Counters State
  const [lastViewedHistoryCount, setLastViewedHistoryCount] = useState(0);
  const [viewedRequestIds, setViewedRequestIds] = useState<string[]>([]);
  const [lastViewedMatchCount, setLastViewedMatchCount] = useState(0); 
  const [statusSessionUnseen, setStatusSessionUnseen] = useState(0);

  const unseenHistoryCount = Math.max(0, history.length - lastViewedHistoryCount);
  const unseenRequestCount = requests.filter(r => !viewedRequestIds.includes(r.id)).length;
  
  const incomingPendingMatches = neighbors.filter(n => n.incomingStatus === 'pending').length;
  const unseenMatchCount = Math.max(0, incomingPendingMatches - lastViewedMatchCount);

  const [activeChatNeighbor, setActiveChatNeighbor] = useState<Neighbor | null>(null);
  const [showMatchInfo, setShowMatchInfo] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Auth Forms State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [regData, setRegData] = useState({
    name: '', surname: '', city: '', prov: '', cap: '', street: '', number: '', 
    floor: '', apartment: '', phone: '', email: '', password: '', confirmPassword: ''
  });
  const [regPhoto, setRegPhoto] = useState<string | null>(null);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [citiesDB, setCitiesDB] = useState<CityData[]>([]);
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [areStreetsLoading, setAreStreetsLoading] = useState(false);

  const [addressErrors, setAddressErrors] = useState({
    city: false,
    prov: false,
    cap: false,
    street: false
  });
  const [isStreetSelected, setIsStreetSelected] = useState(false);

  // ... (Address fetching logic omitted for brevity, logic remains same) ...
  useEffect(() => {
    const loadCities = async () => {
      try {
        const resp = await fetch('https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json');
        const data = await resp.json();
        setCitiesDB(data);
      } catch (e) {
        console.error("Failed to load cities DB", e);
      }
    };
    loadCities();
  }, []);

  const filteredCities = useMemo(() => {
    if (regData.city.length < 2) return [];
    const term = regData.city.toLowerCase();
    return citiesDB.filter(c => c.nome.toLowerCase().startsWith(term)).slice(0, 50);
  }, [regData.city, citiesDB]);

  useEffect(() => {
    setIsStreetSelected(false);
    const timer = setTimeout(async () => {
      if (regData.street.length < 3 || !regData.city) {
          setStreetSuggestions([]);
          return;
      }
      setAreStreetsLoading(true);
      try {
         const q = encodeURIComponent(regData.street);
         const c = encodeURIComponent(regData.city);
         const url = `https://nominatim.openstreetmap.org/search?street=${q}&city=${c}&country=Italy&format=json&addressdetails=1&limit=5`;
         const res = await fetch(url);
         const data = await res.json();
         const roads = new Set<string>();
         data.forEach((item: any) => {
            if (item.address && (item.address.road || item.address.pedestrian || item.address.square)) {
               roads.add(item.address.road || item.address.pedestrian || item.address.square);
            }
         });
         setStreetSuggestions(Array.from(roads));
      } catch (e) { console.error("Nominatim API Error", e); } finally { setAreStreetsLoading(false); }
    }, 500); 
    return () => clearTimeout(timer);
  }, [regData.street, regData.city]);

  const handleCitySelect = (cityData: CityData) => {
    setRegData(prev => ({ ...prev, city: cityData.nome, prov: cityData.sigla, cap: cityData.cap && cityData.cap.length > 0 ? cityData.cap[0] : '', street: '' }));
    setAddressErrors(prev => ({ ...prev, city: false, prov: false, cap: false }));
  };

  const handleStreetSelect = (streetName: string) => {
    setRegData(prev => ({ ...prev, street: streetName }));
    setIsStreetSelected(true);
    setAddressErrors(prev => ({ ...prev, street: false }));
  };

  // --- FIREBASE LISTENERS ---
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
         unsubProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
             if (docSnap.exists()) {
                 const userData = docSnap.data() as User;
                 setUser(userData);
                 setActiveScreen(prev => prev === AppScreen.WELCOME ? AppScreen.HOME : prev);
             }
         });
      } else {
        if (unsubProfile) unsubProfile();
        setUser(null);
        setActiveScreen(AppScreen.WELCOME);
      }
      setIsLoading(false);
    });
    return () => { unsubscribeAuth(); if (unsubProfile) unsubProfile(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubRequests = subscribeToRequests(user.id, (data) => {
      const active = data.filter(r => r.status !== RequestStatus.COMPLETED);
      const completed = data.filter(r => r.status === RequestStatus.COMPLETED);
      active.sort((a, b) => b.id.localeCompare(a.id));
      completed.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
      });
      setRequests(active);
      setHistory(completed);
    });
    const unsubNeighbors = subscribeToNeighbors(user, (data) => setAllUsers(data));
    const unsubMatches = subscribeToMatches(user.id, (data) => setMatches(data));
    const unsubNotifications = subscribeToNotifications(user.id, (data) => setNotifications(data));
    return () => { unsubRequests(); unsubNeighbors(); unsubMatches(); unsubNotifications(); };
  }, [user?.id]);

  // --- WATCHDOG: AUTO-CLEANUP ---
  // Listens for confirmed requests and deletes siblings automatically.
  // This solves the issue where Delegate A accepts, but doesn't have permission/visibility 
  // to delete Delegate B's request. The Requester's app (which sees both) will perform the delete.
  useEffect(() => {
    if (!user || requests.length === 0) return;

    const cleanup = async () => {
      // Only act on OUTGOING requests (where I am the requester)
      const outgoing = requests.filter(r => r.requesterId === user.id);
      if (outgoing.length === 0) return;

      // Group by distinct delivery slot (Date + Time + DeliveryName)
      const groups: Record<string, PackageRequest[]> = {};
      outgoing.forEach(r => {
        const key = `${r.date}_${r.timeFrom}_${r.timeTo}_${r.deliveryName || 'Consegna'}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });

      for (const groupKey in groups) {
        const group = groups[groupKey];
        
        // Is there a winner? (Accepted by anyone, or completed/collected)
        const winner = group.find(r => 
           r.status === RequestStatus.OUT_ACCEPTED || 
           r.status === RequestStatus.IN_ACCEPTED || 
           r.status === RequestStatus.COLLECTED ||
           r.status === RequestStatus.COMPLETED
        );

        if (winner) {
           // Find losers: Anyone who is NOT the winner and NOT already completed
           // This includes PENDING, PROPOSAL, CANCELLED
           const losers = group.filter(r => 
             r.id !== winner.id && 
             r.status !== RequestStatus.COMPLETED && 
             r.status !== RequestStatus.COLLECTED
           );

           if (losers.length > 0) {
             console.log(`[Watchdog] Eliminazione di ${losers.length} richieste obsolete per il gruppo ${groupKey}. Vincitore: ${winner.delegateName}`);
             
             // HISTORY SALVAGE: Retrieve history from losers before deleting
             const logsToSalvage: HistoryEvent[] = [];
             for (const loser of losers) {
                if (loser.historyLog && loser.historyLog.length > 0) {
                    logsToSalvage.push(...loser.historyLog);
                }
                // Execute Hard Delete
                await deletePackageRequest(loser.id);
             }

             // Merge logs into winner
             if (logsToSalvage.length > 0) {
                 await updateRequestDetails(winner.id, {
                     historyLog: arrayUnion(...logsToSalvage) as any
                 });
             }
           }
        }
      }
    };

    // Run cleanup logic whenever requests change
    // Using a timeout to debounce slightly and avoid fighting with rapid updates
    const timer = setTimeout(cleanup, 500);
    return () => clearTimeout(timer);

  }, [requests, user]);

  // --- AUTOMATIC CLEANUP EFFECT FOR NEIGHBORS (MATCHING) ---
  useEffect(() => {
    if (!user) return;
    const combinedNeighbors = allUsers.map(neighborUser => {
        const outgoingMatch = matches.find(m => m.initiator === user.id && m.target === neighborUser.id);
        const incomingMatch = matches.find(m => m.initiator === neighborUser.id && m.target === user.id);
        
        let outgoingStatus: Neighbor['outgoingStatus'] = 'none';
        let verificationCode = undefined;
        let outgoingMatchId = undefined;
        if (outgoingMatch) {
            outgoingMatchId = outgoingMatch.id;
            outgoingStatus = outgoingMatch.status as any; 
            verificationCode = outgoingMatch.verificationCode;
        }

        let incomingStatus: Neighbor['incomingStatus'] = 'none';
        let incomingVerificationCode = undefined;
        let incomingMatchId = undefined;
        if (incomingMatch) {
            incomingMatchId = incomingMatch.id;
            incomingStatus = incomingMatch.status as any; 
            incomingVerificationCode = incomingMatch.verificationCode;
        }

        return { 
            ...neighborUser, 
            outgoingStatus,
            outgoingMatchId,
            verificationCode,
            incomingStatus,
            incomingMatchId,
            incomingVerificationCode
        };
    });
    setNeighbors(combinedNeighbors);
  }, [allUsers, matches, user]);

  const notifyUser = async (targetId: string, notification: Pick<AppNotification, 'title' | 'message' | 'type'>) => {
      await sendNotification(targetId, notification);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ... (Nav handlers omitted for brevity, same as before) ...
  const handleOpenHistory = () => { setLastViewedHistoryCount(history.length); setActiveScreen(AppScreen.HISTORY); };
  const handleOpenStatus = () => {
    const currentIds = requests.map(r => r.id);
    setViewedRequestIds(prev => Array.from(new Set([...prev, ...currentIds])));
    setStatusSessionUnseen(unseenRequestCount);
    setActiveScreen(AppScreen.STATUS);
  };
  const handleOpenMatch = () => { setLastViewedMatchCount(incomingPendingMatches); setActiveScreen(AppScreen.MATCH); };
  const handleOpenChat = (neighborId: string) => { const neighbor = neighbors.find(n => n.id === neighborId) || null; setActiveChatNeighbor(neighbor); setActiveScreen(AppScreen.CHAT_ROOM); };

  // ... (Auth handlers omitted for brevity) ...
  const handleLogin = async () => { setLoginError(''); try { await loginUser(loginEmail, loginPassword); } catch (error: any) { if (error.code === 'auth/invalid-credential') setLoginError('Email o password non corretti.'); else setLoginError('Errore durante l\'accesso. Riprova.'); } };
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => { if (event.target.files && event.target.files[0]) { const file = event.target.files[0]; const reader = new FileReader(); reader.onloadend = () => setRegPhoto(reader.result as string); reader.readAsDataURL(file); } };
  const handleRegister = async () => { 
      // ... (Validation logic same as before) ...
      setRegisterError(''); setAddressErrors({ city: false, prov: false, cap: false, street: false });
      const requiredFields = ['name', 'surname', 'city', 'prov', 'cap', 'street', 'number', 'floor', 'apartment', 'phone', 'email', 'password', 'confirmPassword'];
      if (requiredFields.some(field => (regData as any)[field].trim() === '')) { setRegisterError('Compila tutti i campi obbligatori.'); return; }
      const foundCity = citiesDB.find(c => c.nome.toLowerCase() === regData.city.toLowerCase());
      const errors = { city: !foundCity, prov: !foundCity || foundCity.sigla !== regData.prov.toUpperCase(), cap: !foundCity || !foundCity.cap.includes(regData.cap), street: !isStreetSelected };
      if (errors.city || errors.prov || errors.cap || errors.street) { setAddressErrors(errors); setRegisterError("Correggi gli errori evidenziati."); return; }
      if (regData.password.length < 8) { setRegisterError('Password troppo corta.'); return; }
      if (regData.password !== regData.confirmPassword) { setRegisterError('Password non coincidenti.'); return; }
      setIsRegistering(true); try { await registerUser(regData, regPhoto); setIsRegistering(false); } catch (error: any) { setIsRegistering(false); setRegisterError(error.code === 'auth/email-already-in-use' ? 'Email già registrata.' : error.message); }
  };
  const handleLogout = async () => { await logoutUser(); setActiveScreen(AppScreen.WELCOME); };

  const handleUpdateNeighborStatus = async (id: string, newStatus: string) => {
    if (!user) return;
    const neighbor = neighbors.find(n => n.id === id);
    if (!neighbor) return;
    try {
        if (newStatus === 'pending') { await createMatchRequest(user.id, id); await notifyUser(id, { title: 'Richiesta di Match', message: `${user.name} vuole connettersi con te.`, type: 'match_request' }); }
        else if (newStatus === 'accepted' && neighbor.incomingMatchId) { await updateMatchStatus(neighbor.incomingMatchId, 'accepted'); await notifyUser(id, { title: 'Match Accettato! 🤝', message: `${user.name} ha accettato la richiesta.`, type: 'match_accepted' }); }
        else if (newStatus === 'none' && neighbor.incomingMatchId) { await updateMatchStatus(neighbor.incomingMatchId, 'none'); }
        else if (newStatus === 'complete' && neighbor.outgoingMatchId) { await updateMatchStatus(neighbor.outgoingMatchId, 'complete'); await notifyUser(id, { title: 'Identità Verificata!', message: `${user.name} ti ha verificato come vicino fidato.`, type: 'match_accepted' }); }
    } catch (e) { console.error("Match update failed", e); }
  };
  
  const handleUpdateUser = async (updatedFields: Partial<User>) => { if (!user) return; try { await updateUserProfile(user.id, updatedFields); } catch (e) { console.error("Error updating profile", e); } };

  // --- REQUEST LOGIC WITH HISTORY ---

  const getFullName = () => user ? `${user.name} ${user.surname || ''}`.trim() : 'Utente';

  const handleRequestStatusChange = async (id: string, newStatus: RequestStatus) => {
    if (!user) return;
    try {
      const targetRequest = requests.find(r => r.id === id);
      if (!targetRequest) return;

      const actorName = getFullName();
      
      let actionTitle = "Stato Aggiornato";
      // IMPROVED MAPPING
      if (newStatus === RequestStatus.OUT_ACCEPTED) actionTitle = "Richiesta Accettata";
      else if (newStatus === RequestStatus.OUT_PROPOSAL) actionTitle = "Nuova Proposta";
      else if (newStatus === RequestStatus.IN_ACCEPTED) actionTitle = "Proposta Accettata"; 
      else if (newStatus === RequestStatus.COLLECTED) actionTitle = "Pacco Ritirato";
      else if (newStatus === RequestStatus.COMPLETED) actionTitle = "Consegna Completata";

      const newHistoryEvent: HistoryEvent = {
          date: new Date().toISOString(),
          action: actionTitle,
          actorName: actorName,
          actorId: user.id, 
          // No details for standard status changes as requested
      };

      // 1. Update the Main Request
      await updateRequestDetails(id, { 
          status: newStatus,
          historyLog: arrayUnion(newHistoryEvent) as any
      });

      // 2. CENTRALIZED GROUP CLEANUP (HARD DELETE) WITH HISTORY MERGE
      // When a request is accepted, we delete the siblings. We must save their history (e.g. rejections) first.
      if (newStatus === RequestStatus.OUT_ACCEPTED || newStatus === RequestStatus.IN_ACCEPTED) {
          
          // Identify group criteria (Same Requester AND Same Delivery Name)
          const groupRequests = requests.filter(r => 
              r.requesterId === targetRequest.requesterId && 
              r.deliveryName === targetRequest.deliveryName &&
              r.id !== targetRequest.id // Don't delete the one we just accepted
          );

          const logsToSalvage: HistoryEvent[] = [];

          for (const otherReq of groupRequests) {
              // Safety Check: Don't delete requests that are already COMPLETED or COLLECTED
              if (otherReq.status === RequestStatus.COMPLETED || otherReq.status === RequestStatus.COLLECTED) {
                  continue; 
              }

              // Optional: Send notification before deletion so they know
              if (otherReq.delegateId !== user.id) { 
                  await notifyUser(otherReq.delegateId, { 
                      title: 'Richiesta Chiusa', 
                      message: `Il pacco "${otherReq.deliveryName}" è stato assegnato ad un altro vicino.`, 
                      type: 'info' 
                  });
              }

              // SALVAGE LOGS: Preserve history (like Rejections) from the request being deleted
              if (otherReq.historyLog && otherReq.historyLog.length > 0) {
                  logsToSalvage.push(...otherReq.historyLog);
              }

              // Delete the document
              await deletePackageRequest(otherReq.id);
          }

          // Merge salvaged logs into the survivor (Target Request)
          if (logsToSalvage.length > 0) {
              await updateRequestDetails(id, {
                  historyLog: arrayUnion(...logsToSalvage) as any
              });
          }
      }

      // Notifications logic
      if (newStatus === RequestStatus.OUT_ACCEPTED) await notifyUser(targetRequest.requesterId, { title: 'Richiesta Accettata! ✅', message: `${targetRequest.delegateName} ha confermato che ritirerà il pacco.`, type: 'info' });
      else if (newStatus === RequestStatus.OUT_PROPOSAL) await notifyUser(targetRequest.requesterId, { title: 'Nuova Proposta 🕒', message: `${targetRequest.delegateName} ha proposto un orario diverso.`, type: 'info' });
      else if (newStatus === RequestStatus.IN_ACCEPTED) await notifyUser(targetRequest.delegateId, { title: 'Proposta Accettata! 👍', message: `${targetRequest.requesterName} ha confermato il nuovo orario.`, type: 'info' });

    } catch (e) { console.error("Status update failed", e); }
  };

  const handlePackageCollected = async (req: PackageRequest) => {
    try {
      const actorName = getFullName();
      const newHistoryEvent: HistoryEvent = {
          date: new Date().toISOString(),
          action: req.status === RequestStatus.COLLECTED ? "Consegna Completata" : "Pacco Ritirato",
          actorName: actorName,
          actorId: user?.id,
      };

      if (req.status === RequestStatus.COLLECTED) {
          await updateRequestDetails(req.id, { 
              status: RequestStatus.COMPLETED,
              historyLog: arrayUnion(newHistoryEvent) as any 
          });
          if (user) {
             const newDelegated = (user.packagesDelegated || 0) + 1;
             await updateUserProfile(user.id, { packagesDelegated: newDelegated });
          }
          await notifyUser(req.delegateId, { title: 'Pacco Ricevuto! 📦', message: `${req.requesterName} ha confermato la ricezione.`, type: 'package_collected' });
      } else {
          await updateRequestDetails(req.id, { 
              status: RequestStatus.COLLECTED,
              historyLog: arrayUnion(newHistoryEvent) as any
          });
          if (user) {
            const newCount = (user.packagesCollected || 0) + 1;
            const newHelped = (user.neighborsHelped || 0) + 1;
            await updateUserProfile(user.id, { packagesCollected: newCount, neighborsHelped: newHelped });
          }
          await notifyUser(req.requesterId, { title: 'Pacco Ritirato!', message: `${req.delegateName} ha ritirato il tuo pacco.`, type: 'package_collected' });
      }
    } catch (e) { console.error("Collection failed", e); }
  };

  const handleRequestRemove = async (req: PackageRequest) => { 
      if (!user) return;
      try { 
          // LOGICA CANCELLAZIONE DIFFERENZIATA
          const isRequester = user.id === req.requesterId;
          
          if (isRequester) {
              // SCENARIO 1: IL RICHIEDENTE ELIMINA LA RICHIESTA (HARD DELETE)
              // La card scompare definitivamente per lui. 
              // Per i vicini, sparirà dalle loro liste (dato che il documento non esiste più).
              await deletePackageRequest(req.id);
          } else {
              // SCENARIO 2: IL DELEGATO RIFIUTA (SOFT DELETE / CANCELLAZIONE LOGICA)
              // Lo stato diventa CANCELLED.
              // Lato Delegato: La UI filtrerà via questo stato (quindi la card scompare).
              // Lato Richiedente: Vedrà lo stato "Annullata/Rifiutata" nel modale dei vicini.
              
              const actionTitle = "Richiesta Rifiutata";
              const newHistoryEvent: HistoryEvent = {
                  date: new Date().toISOString(),
                  action: actionTitle,
                  actorName: getFullName(),
                  actorId: user.id,
              };

              await updateRequestDetails(req.id, {
                  status: RequestStatus.CANCELLED,
                  historyLog: arrayUnion(newHistoryEvent) as any
              });

              // Notify the requester
              await notifyUser(req.requesterId, { 
                  title: 'Richiesta Rifiutata ⛔', 
                  message: `${user.name} non può ritirare il pacco in questo momento.`, 
                  type: 'info' 
              });
          }
      } catch (e) { console.error("Remove failed", e); } 
  };

  const handleEditRequest = async (req: PackageRequest) => {
      if (!user) return;
      try {
          const { id, historyLog, ...data } = req;
          
          // Recupera la richiesta originale per confrontare lo stato vecchio
          const originalReq = requests.find(r => r.id === id);
          const oldStatus = originalReq?.status;

          // Since I am editing it, I am the actor.
          const editorName = getFullName();

          // Always report new state for clarity as requested
          const detailsStr = `Nuova consegna: ${formatDateForLog(data.date)} ${data.timeFrom}-${data.timeTo}`;

          // DETECT ACTION TYPE BASED ON NEW STATUS AND TRANSITION
          let actionTitle = "Dettagli Modificati";
          
          // Check specifically for Reactivation or Proposal
          if (oldStatus === RequestStatus.CANCELLED && data.status === RequestStatus.OUT_PENDING) {
              actionTitle = "Richiesta Riattivata";
          } else if (data.status === RequestStatus.OUT_PROPOSAL) {
              // Explicit check for Proposal status to ensure log entry
              actionTitle = "Nuova Proposta";
          } else if (data.status === RequestStatus.OUT_PENDING) {
              actionTitle = "Richiesta Aggiornata";
          }

          const newHistoryEvent: HistoryEvent = {
              date: new Date().toISOString(),
              action: actionTitle,
              actorName: editorName,
              actorId: user.id,
              details: detailsStr
          };

          // Safe Update Payload: Remove undefined values to prevent Firestore errors
          const updatePayload: any = {
              date: data.date, 
              timeFrom: data.timeFrom, 
              timeTo: data.timeTo, 
              status: data.status, 
              lastEditorName: editorName,
              historyLog: arrayUnion(newHistoryEvent)
          };

          // Conditional adds for optional fields
          if (data.notes !== undefined) updatePayload.notes = data.notes;
          if (data.originalDate !== undefined) updatePayload.originalDate = data.originalDate;
          if (data.originalTimeFrom !== undefined) updatePayload.originalTimeFrom = data.originalTimeFrom;
          if (data.originalTimeTo !== undefined) updatePayload.originalTimeTo = data.originalTimeTo;
          if (data.requesterName !== undefined) updatePayload.requesterName = data.requesterName;
          if (data.deliveryName !== undefined) updatePayload.deliveryName = data.deliveryName;

          await updateRequestDetails(id, updatePayload);
          
          const targetId = user.id === req.requesterId ? req.delegateId : req.requesterId;
          const notificationSender = user.id === req.requesterId ? req.requesterName : req.delegateName;
          
          let notifTitle = 'Richiesta Aggiornata ✏️';
          let notifMsg = `${notificationSender || 'Il vicino'} ha modificato i dettagli della consegna.`;
          
          if (actionTitle === "Richiesta Riattivata") {
              notifTitle = 'Richiesta Riattivata 🔄';
              notifMsg = `${notificationSender} ha riattivato la richiesta.`;
          } else if (actionTitle === "Nuova Proposta") {
              notifTitle = 'Nuova Proposta 🕒';
              notifMsg = `${notificationSender} propone un nuovo orario.`;
          }

          await notifyUser(targetId, { title: notifTitle, message: notifMsg, type: 'info' });
      } catch (e) { console.error("Update failed", e); }
  };

  const handleAddDelegates = async (sourceReq: PackageRequest, newDelegateIds: string[]) => {
      if (!user) return;
      
      // Fetch ALL requests in the same "Delivery Group" (same delivery name, same requester)
      const groupRequests = requests.filter(r => 
          (r.deliveryName === sourceReq.deliveryName && r.requesterId === user.id)
      );

      for (const neighborId of newDelegateIds) {
          const neighbor = neighbors.find(n => n.id === neighborId);
          if (!neighbor) continue;
          
          // CHECK: Does a request already exist for this delegate in this group?
          const existingReq = groupRequests.find(r => r.delegateId === neighborId);

          // Details for the new event
          const deliveryDetails = `Consegna: ${formatDateForLog(sourceReq.date)} ${sourceReq.timeFrom}-${sourceReq.timeTo}`;

          if (existingReq) {
              // REACTIVATION LOGIC
              // If it exists (even if Cancelled), we UPDATE it to bring it back to life.
              const actionTitle = "Richiesta Riattivata";
              
              const reactivationLog: HistoryEvent = {
                  date: new Date().toISOString(),
                  action: actionTitle,
                  actorName: getFullName(),
                  actorId: user.id,
                  details: deliveryDetails
              };

              await updateRequestDetails(existingReq.id, {
                  status: RequestStatus.OUT_PENDING,
                  date: sourceReq.date,
                  timeFrom: sourceReq.timeFrom,
                  timeTo: sourceReq.timeTo,
                  notes: sourceReq.notes,
                  // IMPORTANT: Reset "original" fields to current values to clear "Edit" UI state for the delegate
                  originalDate: sourceReq.date,
                  originalTimeFrom: sourceReq.timeFrom,
                  originalTimeTo: sourceReq.timeTo,
                  historyLog: arrayUnion(reactivationLog) as any
              });
              await notifyUser(neighborId, { title: 'Richiesta Riattivata', message: `${user.name} ha rinnovato la richiesta.`, type: 'info' });

          } else {
              // CREATION LOGIC
              // New request document
              const fullName = `${neighbor.name} ${neighbor.surname || ''}`.trim();
              const code = Math.random().toString(36).substring(2, 8).toUpperCase();
              
              const initialLog: HistoryEvent = {
                  date: new Date().toISOString(),
                  action: "Richiesta Creata",
                  actorName: getFullName(),
                  actorId: user.id,
                  details: deliveryDetails
              };

              const newReq = {
                  requesterId: user.id,
                  requesterName: sourceReq.requesterName,
                  delegateId: neighborId,
                  delegateName: fullName,
                  deliveryName: sourceReq.deliveryName,
                  date: sourceReq.date,
                  timeFrom: sourceReq.timeFrom,
                  timeTo: sourceReq.timeTo,
                  notes: sourceReq.notes,
                  status: RequestStatus.OUT_PENDING,
                  type: 'outgoing' as const,
                  code: code,
                  historyLog: [initialLog] // Start fresh history
              };
              await createPackageRequest(newReq);
              await notifyUser(neighborId, { title: 'Nuova Richiesta', message: `${user.name} ha chiesto il tuo aiuto.`, type: 'info' });
          }
      }
  };

  const handleAddRequest = async (newRequests: PackageRequest[]) => {
    if (!user) return;
    
    // We iterate through all proposed new requests
    for (const req of newRequests) {
        const { id, type, ...data } = req;
        
        // CHECK if a request (ACTIVE OR CANCELLED) already exists for this neighbor + delivery name
        // We use the 'requests' state which contains all non-completed requests (including Cancelled)
        const existingReq = requests.find(r => 
            r.delegateId === data.delegateId && 
            r.deliveryName === data.deliveryName &&
            r.requesterId === user.id
        );

        const deliveryDetails = `Consegna: ${formatDateForLog(data.date)} ${data.timeFrom}-${data.timeTo}`;

        if (existingReq) {
            // REACTIVATION LOGIC (Upsert)
            // Instead of creating a new doc, we wake up the old one and APPEND to history
            const reactivationLog: HistoryEvent = {
                date: new Date().toISOString(),
                action: "Richiesta Riattivata",
                actorName: getFullName(),
                actorId: user.id,
                details: deliveryDetails
            };

            await updateRequestDetails(existingReq.id, {
                status: RequestStatus.OUT_PENDING,
                date: data.date,
                timeFrom: data.timeFrom,
                timeTo: data.timeTo,
                notes: data.notes,
                // IMPORTANT: Reset "original" fields to current values to clear "Edit" UI state for the delegate
                originalDate: data.date,
                originalTimeFrom: data.timeFrom,
                originalTimeTo: data.timeTo,
                historyLog: arrayUnion(reactivationLog) as any
            });
            
            await notifyUser(req.delegateId, { title: 'Richiesta Riattivata', message: `${user.name} ha chiesto di nuovo il tuo aiuto.`, type: 'info' });

        } else {
            // CREATE NEW LOGIC (Standard)
            const initialLog: HistoryEvent = {
                date: new Date().toISOString(),
                action: "Richiesta Creata",
                actorName: getFullName(),
                actorId: user.id,
                details: deliveryDetails
            };
            await createPackageRequest({ ...data, historyLog: [initialLog] });
            await notifyUser(req.delegateId, { title: 'Nuova Richiesta', message: `${req.requesterName} ha chiesto il tuo aiuto.`, type: 'info' });
        }
    }
    setActiveScreen(AppScreen.HOME);
  };

  const handleHistoryRating = async (id: string, rating: number) => {
     setHistory(prev => prev.map(item => item.id === id ? { ...item, rating } : item));
     try { 
         const newHistoryEvent: HistoryEvent = {
             date: new Date().toISOString(),
             action: "Valutazione Lasciata",
             actorName: getFullName(),
             actorId: user?.id,
             details: `Voto: ${rating} stelle`
         };
         await updateRequestDetails(id, { 
             rating,
             historyLog: arrayUnion(newHistoryEvent) as any
         }); 
         if(user) {
             const req = [...requests, ...history].find(r => r.id === id);
             if(req) {
                 const targetId = user.id === req.requesterId ? req.delegateId : req.requesterId;
                 await notifyUser(targetId, { title: 'Nuova Valutazione ⭐', message: `${user.name} ti ha valutato con ${rating} stelle!`, type: 'info' });
             }
         }
     } catch (e) { console.error("Error updating rating:", e); }
  };

  // ... (Rest of render, cleanup functions same as before) ...
  const markAllAsRead = async () => { if (!user) return; const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id); if (unreadIds.length > 0) await markNotificationsAsRead(user.id, unreadIds); };
  const handleClearAllNotifications = async () => { if (!user) return; await deleteAllNotifications(user.id); };
  const handleDeleteNotification = async (notificationId: string) => { if (!user) return; await deleteNotification(user.id, notificationId); };
  
  const isChatRoom = activeScreen === AppScreen.CHAT_ROOM;
  
  const { title, subtitle = '' } = (() => { switch (activeScreen) { case AppScreen.HOME: return { title: 'Doora', subtitle: '' }; case AppScreen.NEW_REQUEST: return { title: 'Nuova Richiesta', subtitle: '' }; case AppScreen.STATUS: return { title: 'Stato Richieste', subtitle: '' }; case AppScreen.MATCH: return { title: 'I Tuoi Vicini', subtitle: '' }; case AppScreen.STATS: return { title: 'Statistiche', subtitle: '' }; case AppScreen.HISTORY: return { title: 'Storico', subtitle: '' }; case AppScreen.CALENDAR: return { title: 'Calendario', subtitle: '' }; case AppScreen.CHATS: return { title: 'Conversazioni', subtitle: '' }; case AppScreen.CHAT_ROOM: return { title: activeChatNeighbor?.name || 'Chat', subtitle: '' }; case AppScreen.PROFILE: return { title: 'Mio Profilo', subtitle: '' }; case AppScreen.AI_ASSISTANT: return { title: 'Assistente AI', subtitle: '' }; default: return { title: 'Doora' }; } })();
  let headerAction = undefined; if (activeScreen === AppScreen.MATCH) { headerAction = (<button onClick={() => setShowMatchInfo(true)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all active:scale-90"><Info size={24} /></button>); } else if (activeScreen === AppScreen.HOME) { headerAction = (<button onClick={() => { setShowNotifications(true); markAllAsRead(); }} className="p-2 text-slate-800 hover:bg-slate-100 rounded-full transition-all active:scale-90 relative"><Bell size={24} />{unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">{unreadCount}</span>}</button>); }
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-indigo-600"><Loader2 size={40} className="animate-spin" /></div>;
  if (activeScreen === AppScreen.WELCOME) return <Layout activeScreen={activeScreen} setScreen={setActiveScreen} title="" hideBottomNav={true}><div className="h-[100dvh] w-full bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden px-6 py-6 sm:py-8"><div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div><div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div><div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-6"><div className="relative"><div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[28px] flex items-center justify-center shadow-2xl shadow-indigo-200 rotate-3 transform transition-transform hover:rotate-6"><Package size={40} className="text-white" strokeWidth={1.5} /></div></div><div className="text-center"><h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Doora</h1><p className="text-slate-400 text-xs font-medium text-center max-w-[200px] leading-relaxed mx-auto">La portineria digitale per il tuo condominio.</p></div></div><div className="w-full space-y-3 relative z-10 shrink-0">{loginError && (<div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 shadow-sm"><AlertCircle size={18} className="text-red-500 shrink-0" /><p className="text-[10px] font-bold text-red-700 leading-snug">{loginError}</p></div>)}<div className="space-y-3"><div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email</label><SolidInput type="email" value={loginEmail} onChange={(e: any) => setLoginEmail(e.target.value)} onEnter={handleLogin} placeholder="tua@email.com" icon={Mail} /></div><div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Password</label><div className="relative group"><input type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e: any) => setLoginPassword(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && handleLogin()} placeholder="••••••••" className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl p-3.5 pl-11 pr-11 transition-all outline-none text-slate-700 placeholder-slate-400 text-sm shadow-sm" /><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors z-20">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div></div><div className="flex items-center justify-end"><button className="text-indigo-600 text-[10px] font-bold hover:text-indigo-800 transition-colors">Password dimenticata?</button></div><button onClick={handleLogin} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-3xl font-black text-base shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all mt-2">Accedi</button><div className="text-center pt-1 pb-2"><p className="text-slate-400 text-xs font-medium">Non hai un account? <button onClick={() => { setActiveScreen(AppScreen.REGISTER); setLoginError(''); }} className="text-indigo-600 font-black hover:underline underline-offset-4">Registrati</button></p></div></div></div></Layout>;
  // ... (Register and main return same as before) ...
  if (activeScreen === AppScreen.REGISTER) {
     return (
        <div className="h-screen w-full bg-slate-50 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
            <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 pt-safe sticky top-0 z-30 flex items-center gap-3 shrink-0">
            <button onClick={() => { setActiveScreen(AppScreen.WELCOME); setRegisterError(''); }} className="p-2 -ml-2 text-slate-800 hover:bg-slate-100 rounded-full transition-all active:scale-90"><ChevronLeft size={24} /></button>
            <h1 className="text-lg font-black text-slate-800 tracking-tight">Crea account</h1>
        </header>
            <div className="flex-1 overflow-y-auto px-6 pb-32 pt-8 no-scrollbar z-10">
                <div className="flex justify-center mb-8">
                  <div className="relative group cursor-pointer">
                    <div className="w-28 h-28 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                      {regPhoto ? <img src={regPhoto} alt="Profile" className="w-full h-full object-cover" /> : <Camera size={32} className="text-slate-400" />}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full border-2 border-white shadow-md"><Camera size={16} /></div>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                {registerError && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 mb-6 animate-in slide-in-from-top-4">
                    <AlertCircle size={20} className="text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-700 leading-snug">{registerError}</p>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-3">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Dati Personali</h3>
                     <div className="grid grid-cols-2 gap-3">
                       <SolidInput placeholder="Nome" value={regData.name} onChange={(e: any) => setRegData({...regData, name: e.target.value})} />
                       <SolidInput placeholder="Cognome" value={regData.surname} onChange={(e: any) => setRegData({...regData, surname: e.target.value})} />
                     </div>
                     <SolidInput icon={Phone} type="tel" placeholder="Telefono" value={regData.phone} onChange={(e: any) => setRegData({...regData, phone: e.target.value})} />
                  </div>

                  <div className="space-y-3">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Indirizzo</h3>
                     <div className="grid grid-cols-2 gap-3">
                       <AutocompleteInput 
                         placeholder="Città" 
                         value={regData.city} 
                         onChange={(val: string) => setRegData({...regData, city: val})} 
                         onSelect={handleCitySelect}
                         options={filteredCities}
                         renderOption={(opt: any) => <span className="font-bold">{opt.nome} ({opt.sigla})</span>}
                         zIndex="z-30"
                         hasError={addressErrors.city}
                       />
                       <SolidInput 
                         placeholder="Provincia (es. MI)" 
                         maxLength={2} 
                         value={regData.prov} 
                         onChange={(e: any) => setRegData({...regData, prov: e.target.value.toUpperCase()})}
                         hasError={addressErrors.prov}
                       />
                     </div>
                     <SolidInput 
                         type="number" 
                         placeholder="CAP" 
                         maxLength={5} 
                         value={regData.cap} 
                         onChange={(e: any) => setRegData({...regData, cap: e.target.value})}
                         hasError={addressErrors.cap}
                     />
                     
                     <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <AutocompleteInput 
                             placeholder="Via / Piazza" 
                             value={regData.street} 
                             onChange={(val: string) => setRegData({...regData, street: val})}
                             onSelect={handleStreetSelect}
                             options={streetSuggestions} 
                             zIndex="z-20"
                             isLoading={areStreetsLoading}
                             hasError={addressErrors.street}
                          />
                        </div>
                        <SolidInput placeholder="N°" value={regData.number} onChange={(e: any) => setRegData({...regData, number: e.target.value})} />
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                       <SolidInput 
                          type="number" 
                          placeholder="Piano" 
                          value={regData.floor} 
                          onChange={(e: any) => setRegData({...regData, floor: e.target.value})} 
                       />
                       <SolidInput placeholder="Interno (es. 4B)" value={regData.apartment} onChange={(e: any) => setRegData({...regData, apartment: e.target.value})} />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Account</h3>
                     <SolidInput icon={Mail} type="email" placeholder="Email" value={regData.email} onChange={(e: any) => setRegData({...regData, email: e.target.value})} />
                     <div className="relative group"><input type={showPassword ? "text" : "password"} value={regData.password} onChange={(e: any) => setRegData({...regData, password: e.target.value})} placeholder="Password (min. 8 caratteri)" className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl p-3.5 pl-11 pr-11 transition-all outline-none text-slate-700 placeholder-slate-400 text-sm shadow-sm" /><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors z-20">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                     <div className="relative group"><input type={showConfirmPassword ? "text" : "password"} value={regData.confirmPassword} onChange={(e: any) => setRegData({...regData, confirmPassword: e.target.value})} placeholder="Conferma Password" className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl p-3.5 pl-11 pr-11 transition-all outline-none text-slate-700 placeholder-slate-400 text-sm shadow-sm" /><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors z-20">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                  </div>
                </div>

                <div className="mt-10">
                  <button 
                    onClick={handleRegister}
                    disabled={isRegistering}
                    className={`w-full py-4 rounded-3xl font-black text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isRegistering ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-indigo-200 hover:scale-[1.02]'}`}
                  >
                    {isRegistering ? <Loader2 className="animate-spin" /> : 'Completa Registrazione'}
                  </button>
                </div>
            </div>
        </div>
     );
  }

  if (!user) {
      return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Loader2 size={40} className="animate-spin text-indigo-600" /></div>;
  }

  return (
    <Layout 
      activeScreen={activeScreen} 
      setScreen={setActiveScreen} 
      title={title} 
      subtitle={subtitle} 
      headerAction={headerAction}
      hideBottomNav={isChatRoom}
      onBack={isChatRoom ? () => setActiveScreen(AppScreen.CHATS) : undefined}
    >
      {activeScreen === AppScreen.HOME && (
        <Home 
          setScreen={setActiveScreen} 
          onOpenHistory={handleOpenHistory} 
          user={user} 
          requests={requests} 
          neighbors={neighbors} 
          unseenHistoryCount={unseenHistoryCount} 
          unseenRequestCount={unseenRequestCount} 
          onOpenStatus={handleOpenStatus} 
          unseenMatchCount={unseenMatchCount}
        />
      )}
      {activeScreen === AppScreen.NEW_REQUEST && <NewRequest onSubmit={handleAddRequest} user={user} neighbors={neighbors} />}
      {activeScreen === AppScreen.STATUS && (
        <Status 
          requests={requests} 
          setRequests={setRequests} 
          onOpenChat={handleOpenChat} 
          neighbors={neighbors} 
          onUpdateNeighborStatus={handleUpdateNeighborStatus} 
          onPackageCollected={handlePackageCollected}
          onAction={handleRequestStatusChange}
          onEdit={handleEditRequest}
          onAddDelegates={handleAddDelegates} // Passing the function
          onRequestRemove={handleRequestRemove}
          onVerify={() => {}} 
          onShowCode={() => {}} 
          onRequestPickup={(req) => handlePackageCollected(req)} 
          onContact={handleOpenChat}
          isRequester={true} 
          emptyMessage=""
          unseenCount={statusSessionUnseen}
          currentUser={user} // Pass user for "da Te" logic
        />
      )}
      {activeScreen === AppScreen.MATCH && <Match neighbors={neighbors} onUpdateStatus={handleUpdateNeighborStatus} />}
      {activeScreen === AppScreen.STATS && <Stats user={user} />}
      {activeScreen === AppScreen.HISTORY && (
        <History 
          requests={history} 
          onRate={handleHistoryRating} 
          onBack={() => setActiveScreen(AppScreen.HOME)} 
        />
      )}
      {activeScreen === AppScreen.CALENDAR && <CalendarView requests={[...requests, ...history]} />}
      {activeScreen === AppScreen.CHATS && (
          <ChatsList 
             onSelectNeighbor={handleOpenChat} 
             currentUser={user}
             neighbors={neighbors}
          />
      )}
      {activeScreen === AppScreen.CHAT_ROOM && activeChatNeighbor && (
        <ChatRoom 
            neighbor={activeChatNeighbor} 
            onBack={() => setActiveScreen(AppScreen.CHATS)} 
            currentUser={user}
        />
      )}
      {activeScreen === AppScreen.AI_ASSISTANT && <AIAssistant />}
      {activeScreen === AppScreen.PROFILE && (
        <Profile 
          user={user}
          onBack={() => setActiveScreen(AppScreen.HOME)} 
          onLogout={handleLogout}
          onDeleteAccount={handleLogout}
          onUpdateUser={handleUpdateUser}
        />
      )}

      {showMatchInfo && (
        <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
           <div className="bg-white p-4 rounded">Info Match</div>
        </div>
      )}

      {showNotifications && (
        <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
           <div className="w-[85%] max-w-[320px] bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                 <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-800">Notifiche</h3>
                    {notifications.length > 0 && (
                        <button onClick={handleClearAllNotifications} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">
                            CANCELLA TUTTO
                        </button>
                    )}
                 </div>
                 <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                 {notifications.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-sm">Nessuna notifica</div>
                 ) : (
                    notifications.map(n => (
                       <div key={n.id} className={`p-4 rounded-2xl border ${n.isRead ? 'bg-white border-slate-100' : 'bg-indigo-50 border-indigo-100'} transition-all`}>
                          <div className="flex justify-between items-start mb-1">
                             <h4 className={`font-bold text-sm ${n.isRead ? 'text-slate-700' : 'text-indigo-900'}`}>{n.title}</h4>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400">{n.time}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n.id); }} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
                                    <Trash2 size={14} />
                                </button>
                             </div>
                          </div>
                          <p className={`text-xs ${n.isRead ? 'text-slate-500' : 'text-indigo-700'}`}>{n.message}</p>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;