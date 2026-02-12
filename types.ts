
export enum AppScreen {
  WELCOME = 'welcome',
  REGISTER = 'register',
  HOME = 'home',
  NEW_REQUEST = 'new_request',
  STATUS = 'status',
  HISTORY = 'history',
  STATS = 'stats',
  MATCH = 'match',
  PROFILE = 'profile',
  AI_ASSISTANT = 'ai_assistant',
  CALENDAR = 'calendar',
  CHATS = 'chats',
  CHAT_ROOM = 'chat_room'
}

export interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  city?: string; // Campo aggiunto per filtrare il condominio
  phone?: string;
  address: string;
  apartment: string;
  floor?: string;
  photo?: string;
  level: number;
  rating: number;
  packagesCollected: number;
  packagesDelegated: number;
  memberSince?: string;
  avgPackagesMonth?: number;
  avgResponseTime?: string;
  completionRate?: string;
  neighborsHelped?: number;
  feedbacksReceived?: number;
}

export enum RequestStatus {
  OUT_ACCEPTED = "E' stato accettato",
  OUT_PENDING = "In attesa di conferma",
  OUT_PROPOSAL = "Nuova proposta",
  IN_ACCEPTED = "Hai accettato",
  IN_CONFIRM = "Devi confermare",
  IN_RESPONSE = "In attesa di risposta",
  COLLECTED = "Ritirato",
  COMPLETED = "Completata",
  CANCELLED = "Annullata" // Nuovo stato per richieste rifiutate ma visibili
}

export interface HistoryEvent {
  date: string; // ISO String timestamp
  action: string; // Titolo azione (es. "Richiesta Creata", "Modifica")
  actorName: string; // Chi ha fatto l'azione
  actorId?: string; // ID chi ha fatto l'azione (per identificare "Te")
  details?: string; // Dettagli extra (es. "Orario cambiato in...")
}

export interface PackageRequest {
  id: string;
  requesterId: string;
  requesterName?: string;
  delegateId: string;
  delegateName: string;
  deliveryName?: string; // Nome personalizzato della consegna (es. "Pacco Amazon")
  date: string;
  timeFrom: string;
  timeTo: string;
  notes?: string;
  status: RequestStatus;
  type: 'incoming' | 'outgoing';
  code?: string;
  matchRequested?: boolean;
  rating?: number;
  originalDate?: string;
  originalTimeFrom?: string;
  originalTimeTo?: string;
  lastEditorName?: string; // Nome dell'ultimo utente che ha modificato la richiesta
  historyLog?: HistoryEvent[]; // Cronologia persistente degli eventi
}

export interface Neighbor {
  id: string;
  name: string;
  surname?: string;
  apartment: string;
  floor: string;
  rating: number;
  packages: number;
  
  // STATO ASIMMETRICO
  // La mia relazione verso il vicino (Io voglio verificare lui)
  // none: nessuna azione, pending: ho inviato richiesta, accepted: lui ha accettato (devo verificare), complete: verificato
  outgoingStatus: 'none' | 'pending' | 'accepted' | 'complete';
  outgoingMatchId?: string; // ID del documento match dove IO sono initiator
  verificationCode?: string; // Codice generato quando status è accepted (da mostrare/verificare)

  // La relazione del vicino verso di me (Lui vuole verificare me)
  // none: nessuna azione, pending: lui ha inviato richiesta, accepted: io ho accettato (mostro codice), complete: lui mi ha verificato
  incomingStatus: 'none' | 'pending' | 'accepted' | 'complete';
  incomingMatchId?: string; // ID del documento match dove LUI è initiator
  incomingVerificationCode?: string; // Codice che io devo mostrare a lui
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'match_request' | 'match_accepted' | 'package_collected' | 'info';
}
