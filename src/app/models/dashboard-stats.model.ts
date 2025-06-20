import { DaySum } from "./day-sum";
import { MembreRetard } from "./membre-retard";


export interface DashboardStats {
  totalPayes: number;
  totalAnnules: number;
  totalAttente: number;
  pourcentagePayesMois: number;
  courbe: DaySum[]; // ✅ nécessaire pour le graphique
    membresEnRetard: MembreRetard[];
}
