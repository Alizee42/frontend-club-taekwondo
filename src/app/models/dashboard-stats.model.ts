import { DaySum } from "./day-sum";
import { MembreRetard } from "./membre-retard";


export interface DashboardStats {
  totalPayes: number;
  totalAnnules: number;
  totalAttente: number;
  pourcentagePayesMois: number;
  courbe: DaySum[]; 
  membresEnRetard: MembreRetard[];
}
