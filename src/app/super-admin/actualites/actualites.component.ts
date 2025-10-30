import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiTitleComponent } from '../../ui/ui-title/ui-title.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';

@Component({
  selector: 'app-super-admin-actualites',
  standalone: true,
  imports: [CommonModule, FormsModule, UiTitleComponent, UiButtonComponent, UiTableComponent],
  templateUrl: './actualites.component.html',
  styleUrls: ['./actualites.component.css']
})
export class ActualitesComponent {
  showAddModal = false;
  actualites: any[] = [];
  columns = [
    { key: 'titre', label: 'Titre' },
    { key: 'date', label: 'Date' },
    { key: 'auteur', label: 'Auteur' }
  ];
  newTitre = '';
  newAuteur = '';
  newContenu = '';

  openAddModal() { this.showAddModal = true; }
  closeAddModal() { this.showAddModal = false; }
  addActualite() {
    if (!this.newTitre || !this.newAuteur) return;
    this.actualites = [{
      titre: this.newTitre,
      date: new Date().toLocaleDateString(),
      auteur: this.newAuteur,
      contenu: this.newContenu
    }, ...this.actualites];
    this.newTitre = '';
    this.newAuteur = '';
    this.newContenu = '';
    this.closeAddModal();
  }
}