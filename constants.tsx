
import { User } from './types';

export interface LevelRequirement {
  totalPackages?: number;
  collected?: number;
  delegated?: number;
  feedbacks?: number;
  rating?: number;
  responseTime?: number; // In hours (optional implementation)
  noReportsDays?: number; // Days without reports
}

export interface LevelDef {
  level: number;
  name: string;
  req: LevelRequirement;
  description: string;
}

export const USER_LEVELS: LevelDef[] = [
  {
    level: 1,
    name: "Nuovo Arrivato",
    description: "Inizia la tua avventura nel condominio.",
    req: { totalPackages: 1 } // "1 pacco ritirato oppure 1 pacco fatto ritirare" -> Totale >= 1
  },
  {
    level: 2,
    name: "Vicino Disponibile",
    description: "Inizia a farti conoscere.",
    req: { totalPackages: 3, collected: 1 }
  },
  {
    level: 3,
    name: "Vicino Collaborativo",
    description: "Una risorsa per il piano.",
    req: { totalPackages: 5, feedbacks: 2 }
  },
  {
    level: 4,
    name: "Aiutante Attivo",
    description: "Sempre pronto a dare una mano.",
    req: { totalPackages: 10, collected: 5, rating: 4.0 }
  },
  {
    level: 5,
    name: "Punto di Riferimento",
    description: "I vicini contano su di te.",
    req: { totalPackages: 20, collected: 10, delegated: 5, rating: 4.2 }
  },
  {
    level: 6,
    name: "Vicino Affidabile",
    description: "Una garanzia per tutti.",
    req: { totalPackages: 35, collected: 20, feedbacks: 10, rating: 4.4 }
  },
  {
    level: 7,
    name: "Custode del Palazzo",
    description: "Conosci ogni angolo e persona.",
    req: { totalPackages: 50, collected: 30, rating: 4.5 }
  },
  {
    level: 8,
    name: "Super Vicino",
    description: "Eroe di tutti i giorni.",
    req: { totalPackages: 80, collected: 50, rating: 4.6 }
  },
  {
    level: 9,
    name: "Colonna del Condominio",
    description: "Il pilastro della comunità.",
    req: { totalPackages: 120, collected: 80, feedbacks: 30, rating: 4.7 }
  },
  {
    level: 10,
    name: "Leggenda del Vicinato",
    description: "Affidabilità Totale.",
    req: { totalPackages: 200, collected: 120, rating: 4.8 }
  }
];

export const calculateUserLevel = (user: User): number => {
  const pCollected = Number(user.packagesCollected || 0);
  const pDelegated = Number(user.packagesDelegated || 0);
  const total = pCollected + pDelegated;
  const feedbacks = Number(user.feedbacksReceived || 0);
  const rating = Number(user.rating || 5.0);

  // Itera i livelli dal più alto al più basso
  // Se l'utente soddisfa i requisiti, ritorna quel livello
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    const level = USER_LEVELS[i];
    const req = level.req;
    
    let met = true;
    if (req.totalPackages !== undefined && total < req.totalPackages) met = false;
    if (req.collected !== undefined && pCollected < req.collected) met = false;
    if (req.delegated !== undefined && pDelegated < req.delegated) met = false;
    if (req.feedbacks !== undefined && feedbacks < req.feedbacks) met = false;
    if (req.rating !== undefined && rating < req.rating) met = false;
    
    // Note: responseTime and noReportsDays are ignored for calculation simplicity in this version
    
    if (met) return level.level;
  }
  return 1; // Default level if nothing met (usually level 1 requires just 1 package, so 0 packages = level 0 logically, but let's stick to 1 as base)
};
