export interface ParametresPaiement {
  montantCotisation: number;
  virement: boolean;
  especes: boolean;
  stripe: boolean;
  modePaiementParDefaut: string;
  echeancesAutorisees: number;
  intervalleEcheance: string;
}
