import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../../ui/buttons/ui-button/ui-button.component';
import { EmptyStateComponent } from '../../ui/empty-state/empty-state.component';
import { AuthService } from '../../../services/auth.service';
import { UiModalComponent } from '../../ui/modal/ui-modal.component';

export interface EcheanceModel {
  id?: number;
  numero?: number;
  dateEcheance?: string | Date;
  montant?: number;
  statut?: string;
}

export interface PaiementModel {
  id?: number;
  montantTotal?: number;
  echeances?: any[] | undefined;
}

@Component({
  selector: 'app-echeance',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, EmptyStateComponent, UiModalComponent],
  templateUrl: './echeance.component.html',
  styleUrls: ['./echeance.component.css']
})
export class EcheanceComponent {
  @Input() paiement?: any | null = null;
  @Input() echeances: any[] | undefined;
  @Input() showModal: boolean = false;
  @Input() inline: boolean = false;

  @Output() payerEcheance = new EventEmitter<any>();
  @Output() marquerTout = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();
  constructor(private auth: AuthService) {}

  get payLabel(): string {
    try {
      const role = (this.auth.getRole() || '').toString().toUpperCase();
      return role === 'SUPER_ADMIN' ? 'Marquer comme payé' : 'Payer';
    } catch (e) {
      return 'Payer';
    }
  }
  close() { this.closed.emit(); }

  private sansAccents(s?: string): string {
    const v = s || '';
    try {
      return v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    } catch (err) {
      return v.toLowerCase();
    }
  }

  classeBadge(statut?: string): string {
    const s = this.sansAccents(statut || '');
    if (s === 'paye' || s === 'payé') return 'status-badge status--success';
    if (s.includes('retard')) return 'status-badge status--danger';
    if (s.includes('annul')) return 'status-badge';
    if (s.includes('attente')) return 'status-badge status--warning';
    return 'status-badge status--info';
  }

  statutEcheance(e: EcheanceModel): string {
    return this.isLate(e) ? 'en retard' : (e?.statut || 'en attente');
  }

  isLate(e: EcheanceModel): boolean {
    if (!e || this.isPaye(e.statut) || !e.dateEcheance) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(e.dateEcheance);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  dateLabel(e: EcheanceModel): string {
    if (!e?.dateEcheance) return 'Aucune date';
    const date = new Date(e.dateEcheance);
    if (Number.isNaN(date.getTime())) return 'Date invalide';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  dateHint(e: EcheanceModel): string {
    if (!e?.dateEcheance) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(e.dateEcheance);
    due.setHours(0, 0, 0, 0);
    if (Number.isNaN(due.getTime())) return '';
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (this.isPaye(e.statut)) return 'Reglee';
    if (days < 0) return `${Math.abs(days)} j de retard`;
    if (days === 0) return 'A regler aujourd hui';
    if (days === 1) return 'A regler demain';
    return `Dans ${days} jours`;
  }

  isPaye(statut?: string): boolean {
    return this.sansAccents(statut || '').includes('paye');
  }

  hasUnpaidEcheances(): boolean {
    return (this.echeances || []).some((e: any) => !this.isPaye(e?.statut));
  }

  paidCount(g: any): number {
    return (g?.echeances || []).filter((e: any) => this.isPaye(e?.statut)).length;
  }

  progressionGroupe(g: any): number {
    const total = (g?.echeances || []).length;
    if (!total) return 0;
    return Math.round((this.paidCount(g) / total) * 100);
  }

  montantPayeGroupe(g: any): number {
    return (g?.echeances || []).reduce((sum: number, e: any) => {
      return this.isPaye(e?.statut) ? sum + (Number(e?.montant) || 0) : sum;
    }, 0);
  }

  montantRestantGroupe(g: any): number {
    const total = Number(g?.montantTotal) || (g?.echeances || []).reduce((sum: number, e: any) => sum + (Number(e?.montant) || 0), 0);
    return Math.max(0, total - this.montantPayeGroupe(g));
  }

  onPayer(e: EcheanceModel) {
    if (!this.paiement) return;
    // Emit l'événement quel que soit le rôle (backend gère l'autorisation)
    this.payerEcheance.emit({ paiement: this.paiement, echeance: e });
  }

  onMarquerTout() {
    if (!this.paiement) return;
    this.marquerTout.emit(this.paiement);
  }

  /** Group echeances by paiementId for inline display */
  get groupedEcheances(): Array<any> {
    if (!Array.isArray(this.echeances)) return [];
    const map = new Map<number | string, any>();
    for (const e of this.echeances || []) {
      const key = e.paiementId ?? 'no-paiement';
      if (!map.has(key)) {
        map.set(key, {
          paiementId: key,
          paiementDate: e.paiementDate,
          parentPrenom: e.parentPrenom,
          parentNom: e.parentNom,
          membrePrenom: e.membrePrenom,
          membreNom: e.membreNom,
          club: e.club,
          montantTotal: e.montantTotal,
          montantPaye: e.montantPaye,
          montantRestant: e.montantRestant,
          echeances: []
        });
      }
      map.get(key).echeances.push(e);
    }
    return Array.from(map.values());
  }
}
