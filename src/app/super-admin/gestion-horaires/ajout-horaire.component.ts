import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ajout-horaire',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ajout-horaire.component.html',
  styleUrls: ['./ajout-horaire.component.css']
})
export class AjoutHoraireComponent {
  @Output() horaireAjoute = new EventEmitter<any>();
  jour: string = '';
  plageHoraire: string = '';

  ajouter() {
    if (this.jour && this.plageHoraire) {
      const [heureDebut, heureFin] = this.plageHoraire.split(' - ');
      this.horaireAjoute.emit({ jour: this.jour, heureDebut, heureFin });
      this.jour = '';
      this.plageHoraire = '';
    }
  }
}
