import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../../ui/buttons/ui-button/ui-button.component';
import { AuthService } from '../../../services/auth.service';

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
  imports: [CommonModule, UiButtonComponent],
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
    if (s === 'payé' || s === 'paye' || s === 'paye') return 'badge badge-success';
    if (s.includes('retard')) return 'badge badge-danger';
    if (s.includes('annul') || s.includes('annulé')) return 'badge badge-secondary';
    if (s.includes('attente')) return 'badge badge-warning';
    return 'badge badge-dark';
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
        map.set(key, { paiementId: key, paiementDate: e.paiementDate, parentPrenom: e.parentPrenom, parentNom: e.parentNom, membrePrenom: e.membrePrenom, membreNom: e.membreNom, club: e.club, echeances: [] });
      }
      map.get(key).echeances.push(e);
    }
    return Array.from(map.values());
  }
}
