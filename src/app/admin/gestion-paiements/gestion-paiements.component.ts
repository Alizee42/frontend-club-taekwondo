import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, Title, CategoryScale, Tooltip, Filler
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Tooltip, Filler);

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

  vueActive: string = 'tableau';

  filtreRecherche = '';
  filtreStatut = '';
  filtreMoyen = '';

  chart: Chart | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPaiements();
  }

  changerVue(vue: string): void {
    this.vueActive = vue;
  }

  appliquerFiltres(): void {
    const recherche = this.filtreRecherche.toLowerCase();
    this.utilisateursFiltres = this.paiements.filter(u => {
      const matchRecherche = !recherche || u.Nom.toLowerCase().includes(recherche) || u.Email.toLowerCase().includes(recherche);
      const matchStatut = !this.filtreStatut || u.Statut === this.filtreStatut;
      const matchMoyen = !this.filtreMoyen || u['Moyen de paiement'] === this.filtreMoyen;
      return matchRecherche && matchStatut && matchMoyen;
    });
  }

  async loadPaiements(): Promise<void> {
    const headers = this.getHeaders();
    try {
      const paiementsRaw = await this.http.get<any[]>('http://localhost:8080/api/paiements', { headers }).toPromise();

      if (!paiementsRaw || paiementsRaw.length === 0) {
        console.warn('Aucune donnée reçue depuis l\'API.');
        return;
      }

      const utilisateursCache = new Map<number, any>();

      this.paiements = await Promise.all(
        paiementsRaw.map(async (p) => {
          let utilisateur = utilisateursCache.get(p.utilisateurId);

          if (!utilisateur) {
            try {
              utilisateur = await this.http.get<any>(`http://localhost:8080/api/utilisateurs/${p.utilisateurId}`, { headers }).toPromise();
              utilisateursCache.set(p.utilisateurId, utilisateur);
            } catch (err) {
              console.error(`Erreur lors de la récupération de l'utilisateur ${p.utilisateurId}`, err);
              utilisateur = { nom: 'Utilisateur inconnu', email: 'Email non disponible' };
            }
          }

          const montant = Number(p.montant) || 0;
          const montantRestant = Number(p.montantRestant) || 0;

          return {
            id: p.id,
            Nom: utilisateur.nom || 'Utilisateur inconnu',
            Email: utilisateur.email || 'Email non disponible',
            'Montant payé (€)': montant - montantRestant,
            'Montant restant (€)': montantRestant,
            Statut: p.statut || 'Statut inconnu',
            'Moyen de paiement': p.modePaiement || 'Moyen inconnu',
            'Dernier paiement': p.datePaiement || 'Date non disponible',
            Echeances: Array.isArray(p.echeances)
              ? p.echeances.map((e: any) => `${e.dateEcheance || 'Date inconnue'} (${e.statut || 'Statut inconnu'})`).join(', ')
              : 'Aucune échéance'
          };
        })
      );

      this.utilisateursFiltres = [...this.paiements];
      this.calculerKPI();

    } catch (error) {
      console.error('Erreur lors de la récupération des paiements :', error);
    }
  }

  calculerKPI(): void {
    const totalPayé = this.paiements.reduce((acc, p) => acc + (p['Montant payé (€)'] || 0), 0);
    const totalRestant = this.paiements.reduce((acc, p) => acc + (p['Montant restant (€)'] || 0), 0);
    const total = this.paiements.length || 1;
    const àJour = this.paiements.filter(p => p.Statut === 'payé').length;

    this.kpiList = [
      { label: '💰 Total encaissé (€)', value: totalPayé },
      { label: '🧾 Paiements en attente (€)', value: totalRestant },
      { label: '✅ Membres à jour (%)', value: Math.round((àJour / total) * 100) },
      { label: '🔁 Paiements récurrents', value: 2 }, // À remplacer
      { label: '⏱️ Échéances à venir', value: 3 }     // À remplacer
    ];
  }

  initChart(data: { day: string, total: number }[]): void {
    const canvas = document.getElementById('paiementsChart') as HTMLCanvasElement;
    if (!canvas || !data) return;

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
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Évolution des paiements (30 jours)' }
        }
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
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
}
