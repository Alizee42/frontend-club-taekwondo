export interface CommandeDTO {
    id: number;
    dateCommande: string;
    montantTotal: number;
    modePaiement: string;
    statut: string;
    utilisateurId?: number;
    utilisateur?: UtilisateurCommandeDTO;
    lignesCommande: LigneCommandeDTO[];
  }
  
  export interface UtilisateurCommandeDTO {
    id: number;
    nom: string;
    prenom: string;
    email?: string;
  }
  
  export interface LigneCommandeDTO {
    id: number;
    commandeId: number;
    produitId?: number;
    produitNom: string;
    quantite: number;
    prixUnitaire: number;
    sousTotal: number;
    taille: string;
    couleur: string;
    flocage: string;
  }
  