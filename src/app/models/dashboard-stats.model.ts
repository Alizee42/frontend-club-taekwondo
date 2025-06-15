export interface DaySum {
  day: string;
  total: number;
}

export interface MembreRetard {
  nom: string;
  montantRestant: number;
}

export interface DashboardStats {
  totalPayes: number;
  totalAttente: number;
  totalAnnules: number;
  pourcentagePayesMois: number;
  courbe30J: DaySum[];
  topRetards: MembreRetard[];
}
