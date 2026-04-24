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

  isPaye(statut?: string): boolean {
    return this.sansAccents(statut || '') === 'paye';
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
