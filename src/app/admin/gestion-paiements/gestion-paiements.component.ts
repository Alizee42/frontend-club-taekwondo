import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, Title, CategoryScale, Tooltip, Filler
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Filler);

interface Paiement {
  id: number;
  utilisateurId: number;
  montant: number;
  montantRestant: number;
  statut: string;
  modePaiement: string;
  datePaiement: string;
  echeances: Echeance[];
}

interface Echeance {
  dateEcheance: string;
  statut: string;
  montant: number;
}

interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

@Component({
  selector: 'app-gestion-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './gestion-paiements.component.html',
  styleUrls: ['./gestion-paiements.component.css']
})
export class GestionPaiementsComponent implements OnInit {
  paiements: any[] = [];
  utilisateursFiltres: any[] = [];
  kpiList: { label: string, value: any }[] = [];
  alertes: string[] = [];
  stats: {
    totalPayes: number;
    totalAttente: number;
    totalAnnules: number;
    pourcentagePayesMois: number;
  } = {
    totalPayes: 0,
    totalAttente: 0,
    totalAnnules: 0,
    pourcentagePayesMois: 0,
  };

  vueActive: string = 'tableau';

  filtreRecherche = '';
  filtreStatut = '';
  filtreMoyen = '';
  filtrerRetards = false;

  moisDispo: string[] = ['Juin', 'Juillet', 'Août'];
  moisSelectionne: string = '';

  chart: Chart | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('🔄 Initialisation du composant...');
    this.moisSelectionne = this.moisDispo[0];
    this.loadPaiements();
  }
  changerVue(vue: string): void {
    console.log(`🔄 Changement de vue : ${vue}`);
    this.vueActive = vue;
  }

     appliquerFiltres(): void {
    console.log('🔄 Application des filtres...');
    const recherche = this.filtreRecherche.toLowerCase();
    this.utilisateursFiltres = this.paiements.filter(u => {
      const matchRecherche = !recherche || u.nom.toLowerCase().includes(recherche) || u.email.toLowerCase().includes(recherche);
      const matchStatut = !this.filtreStatut || u.statut === this.filtreStatut;
      const matchMoyen = !this.filtreMoyen || u.modePaiement === this.filtreMoyen;
      const matchRetard = !this.filtrerRetards || (u.echeances.some((e: Echeance) => e.statut === 'retard'));
      return matchRecherche && matchStatut && matchMoyen && matchRetard;
    });

    console.log('✅ Utilisateurs filtrés :', this.utilisateursFiltres);
  }

  chargerEcheances(): void {
    console.log('🔄 Chargement des échéances pour le mois sélectionné :', this.moisSelectionne);
  
    // Filtrer uniquement les paiements avec des échéances
    this.paiements = this.paiements.filter(paiement => paiement.echeances && paiement.echeances.length > 0);
  
    console.log('📋 Paiements avec échéances :', this.paiements);
  }

  // 🔁 Récupération des paiements
  async loadPaiements(): Promise<void> {
    console.log('🔄 Début du chargement des paiements...');
    const headers = this.getHeaders();
    try {
      const paiementsRaw = await this.http.get<any[]>('http://localhost:8080/api/paiements', { headers }).toPromise();
      console.log('📦 Paiements reçus du backend :', paiementsRaw);
  
      if (!paiementsRaw || paiementsRaw.length === 0) {
        console.warn("⚠️ Aucune donnée reçue");
        return;
      }
  
      const utilisateursCache = new Map<number, any>();
      this.paiements = await Promise.all(
        paiementsRaw.map(async (p) => {
          console.log('🔍 Traitement du paiement :', p);
  
          let utilisateur = utilisateursCache.get(p.utilisateurId);
          if (!utilisateur) {
            try {
              utilisateur = await this.http.get<any>(`http://localhost:8080/api/utilisateurs/${p.utilisateurId}`, { headers }).toPromise();
              utilisateursCache.set(p.utilisateurId, utilisateur);
              console.log('👤 Utilisateur chargé :', utilisateur);
            } catch (err) {
              console.error('❌ Erreur lors du chargement de l\'utilisateur :', err);
              utilisateur = { nom: "Inconnu", email: "Non disponible" };
            }
          }
  
          const estUnique = !p.echeances || p.echeances.length === 0;
  
          const montantRestant = estUnique
            ? p.montantRestant || 0
            : p.echeances
                .filter((e: Echeance) => e.statut !== 'payé')
                .reduce((acc: number, e: Echeance) => acc + (e.montant || 0), 0);
          console.log('💰 Montant restant calculé :', montantRestant);
  
          let statut = p.statut || "en attente";
          if (estUnique) {
            statut = (montantRestant === 0) ? "payé" : "en attente";
          } else {
            const reste = p.echeances.filter((e: Echeance) => e.statut !== 'payé').length;
            statut = reste === 0 ? "payé" : "en attente";
          }
          console.log('📊 Statut déterminé :', statut);
  
          const montantPaye = estUnique
            ? p.montant // Pour les paiements uniques, le montant total est payé
            : (p.montant ?? 0) - montantRestant;
          console.log('💰 Montant payé calculé :', montantPaye);
  
          return {
            id: p.id,
            nom: utilisateur.nom,
            prenom: utilisateur.prenom || "",
            email: utilisateur.email,
            montantPaye,
            montantRestant,
            statut,
            moyenPaiement: p.modePaiement,
            dernierPaiement: p.datePaiement,
            echeancesText: estUnique
              ? "Paiement unique"
              : p.echeances.map((e: Echeance) => `${e.dateEcheance} (${e.statut})`).join(", "),
            echeances: p.echeances || []
          };
        })
      );
  
      console.log('✅ Paiements traités :', this.paiements);
  
      this.utilisateursFiltres = [...this.paiements];
      console.log('📋 Utilisateurs filtrés :', this.utilisateursFiltres);
  
      // Préparer les données pour le graphique
      const courbeData = this.paiements.map(p => ({
        day: p.dernierPaiement,
        total: p.montantPaye
      }));
      console.log('📊 Données pour le graphique :', courbeData);
  
      // Initialiser le graphique
      this.initChart(courbeData);
  
      // Calculer les statistiques
      this.calculerStats();
  
    } catch (err) {
      console.error("❌ Erreur lors du chargement des paiements :", err);
    }
  }

calculerKPI(): void {
  console.log('🔄 Début du calcul des KPI...');
  const paiementsValides = this.paiements.filter(p => p.statut !== 'annulé');
  console.log('📋 Paiements valides :', paiementsValides);

  const totalPayé = paiementsValides.reduce((acc, p) => acc + (p.montantPaye || 0), 0);
  const totalRestant = paiementsValides.reduce((acc, p) => acc + (p.montantRestant || 0), 0);
  const totalAnnules = this.paiements.filter(p => p.statut === 'annulé').length;
  const total = paiementsValides.length || 1;
  const àJour = paiementsValides.filter(p => p.statut === 'payé').length;

  this.stats = {
    totalPayes: totalPayé,
    totalAttente: totalRestant,
    totalAnnules,
    pourcentagePayesMois: Math.round((àJour / total) * 100),
  };

  console.log('✅ KPI calculés :', this.stats);
}

genererAlertes(): void {
  this.alertes = this.paiements.flatMap(p =>
    (p.echeances || []).filter((e: Echeance) => e.statut === 'retard')
      .map((e: Echeance) => `${p.nom} a une échéance en retard (${e.dateEcheance})`)
  );
  console.log('🔔 Alertes générées :', this.alertes);
}

  ouvrirPaiementUtilisateur(u: any): void {
    alert(`Ajouter un paiement pour ${u.nom}`);
  }

  envoyerRappelIndividuel(u: any): void {
    alert(`Rappel envoyé à ${u.nom}`);
  }

  relancerEcheance(echeance: any): void {
    alert(`Rappel pour échéance du ${echeance.dateEcheance}`);
  }

  exporterResume(): void {
    alert("Export résumé mensuel à implémenter.");
  }

  ouvrirModalPaiement(): void {
    alert('Fonction à implémenter : ajout manuel de paiement.');
  }

  exporterCSV(): void {
    alert('Fonction à implémenter : export CSV.');
  }

  envoyerRappels(): void {
    alert('Fonction à implémenter : rappels paiements.');
  }

  initChart(data: { day: string, total: number }[]): void {
        const canvas = document.getElementById('paiementsChart') as HTMLCanvasElement;
    console.log('📊 Canvas récupéré :', canvas);
    if (!canvas) {
      console.error('❌ Canvas introuvable');
      return;
    }
    const labels = data.map(d => d.day);
    const dataset = data.map(d => d.total);
  
    if (this.chart) this.chart.destroy();
  
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Total encaissé',
          data: dataset,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Permet au graphique de s'adapter à la taille du canvas
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Évolution des paiements (30 jours)' }
        },
        scales: {
          x: {
            title: { display: true, text: 'Date' }
          },
          y: {
            title: { display: true, text: 'Montant (€)' },
            beginAtZero: true
          }
        }
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
    calculerStats(): void {
    console.log('🔄 Début du calcul des statistiques...');
    let totalPayes = 0;
    let totalAttente = 0;
    let totalAnnules = 0;
    let totalPaiements = this.paiements.length;
    let payes = 0;
  
    for (const p of this.paiements) {
      console.log('📊 Traitement du paiement pour les stats :', p);
  
      totalPayes += p.montantPaye || 0;
  
      if (p.statut === 'annulé') {
        totalAnnules += p.montantRestant;
      } else if (p.statut === 'payé' || (p.montantRestant === 0 && p.echeances?.length === 0)) {
        payes += 1;
      } else if (p.statut === 'en attente' && p.echeances?.length > 0) {
        totalAttente += p.echeances
          .filter((e: Echeance) => e.statut !== 'payé')
          .reduce((acc: number, e: Echeance) => acc + (e.montant || 0), 0);
      }
    }
  
    const pourcentagePayesMois = totalPaiements > 0 ? (payes / totalPaiements) * 100 : 0;
  
    this.stats = {
      totalPayes,
      totalAttente,
      totalAnnules,
      pourcentagePayesMois: +pourcentagePayesMois.toFixed(2)
    };
  
    console.log('✅ Statistiques calculées :', this.stats);
  }
}