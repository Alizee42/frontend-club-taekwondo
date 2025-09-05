import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Ajout pour ngModel

@Component({
  selector: 'app-evenements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evenements.component.html',
  styleUrls: ['./evenements.component.css']
})
export class EvenementsComponent implements OnInit {
  evenements: any[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  modalVisible = false;
  evenementSelectionne: any = null;
  commentaire: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerEvenements();
  }

  chargerEvenements(): void {
    this.http.get<any[]>('/api/evenements').subscribe({
      next: (data) => {
        this.evenements = data.filter(e => e.actif !== false);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur lors du chargement des événements.';
        this.isLoading = false;
      }
    });
  }

  inscrire(evenement: any): void {
    this.evenementSelectionne = evenement;
    this.modalVisible = true;
  }

  fermerModal(): void {
    this.modalVisible = false;
    this.evenementSelectionne = null;
    this.commentaire = '';
  }

  confirmerInscription(): void {
    const utilisateur = JSON.parse(localStorage.getItem('utilisateur') || 'null');
    if (!utilisateur || !utilisateur.id) {
      alert("Veuillez vous connecter pour vous inscrire.");
      this.fermerModal();
      return;
    }

    const dto = {
      
      evenementId: this.evenementSelectionne.id,
      utilisateurId: utilisateur.id,
      commentaire: this.commentaire
    };
    
    this.http.post('/api/inscriptions', dto).subscribe({
      next: () => {
        this.successMessage = `Inscription réussie à "${this.evenementSelectionne.titre}"`;
        this.fermerModal();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        console.error('Erreur inscription :', err);
        this.errorMessage = `Erreur lors de l'inscription à "${this.evenementSelectionne.titre}".`;
        this.fermerModal();
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }
}
