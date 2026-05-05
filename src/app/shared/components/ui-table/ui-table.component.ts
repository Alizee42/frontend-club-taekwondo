import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiIconButtonComponent } from '../../ui/buttons/ui-icon-button/ui-icon-button.component';
import { UiButtonComponent } from '../../ui/buttons/ui-button/ui-button.component';

export interface UiTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'custom' | 'image' | 'button';
  // Classe(s) appliquées sur la cellule (td) elle-même
  cellClass?: string;
  // Fournit une valeur d'affichage alternative au lieu de row[key]
  display?: (row: any) => string | number | Date;
  // Classe(s) appliquées sur le span intérieur qui entoure le contenu texte
  textClass?: string | ((row: any) => string | string[]);
  render?: (row: any) => string;
  width?: string;
  headerClass?: string;
  // Icône de tête de cellule (ex: genre, statut)
  iconClass?: (row: any) => string;
  // Configuration optionnelle pour un bouton dans la cellule
  buttonLabel?: string;
  buttonIcon?: string;
  buttonVariant?: 'primary' | 'secondary' | 'danger';
  buttonCustomClass?: string;
  buttonDisabled?: (row: any) => boolean;
  buttonLink?: (row: any) => string | null | undefined;
  buttonOnClick?: (row: any) => void;
}

@Component({
  selector: 'ui-table',
  standalone: true,
  imports: [CommonModule, FormsModule, UiIconButtonComponent, UiButtonComponent],
  templateUrl: './ui-table.component.html',
  styleUrls: ['./ui-table.component.css']
})
export class UiTableComponent {
  @Input() columns: UiTableColumn[] = [];
  @Input() data: any[] = [];
  @Input() actions: Array<{ label: string; icon?: string; iconText?: string; action: string; color?: string; variant?: 'primary'|'secondary'|'danger'|'ghost'; disabled?: boolean; customClass?: string; show?: (row: any) => boolean; title?: string }> = [];
  @Output() actionClick = new EventEmitter<{ action: string; row: any }>();
  @Output() editCell = new EventEmitter<{ row: any; key: string; value: any }>();

  editing: { row: any; key: string } | null = null;
  editValue: any = '';

  onAction(action: string, row: any) {
    this.actionClick.emit({ action, row });
  }

  startEdit(row: any, key: string) {
    this.editing = { row, key };
    this.editValue = row[key];
  }

  isEditing(row: any, key: string): boolean {
    return !!this.editing && this.editing.row === row && this.editing.key === key;
  }

  saveEdit(row: any, key: string) {
    row[key] = this.editValue;
    this.editCell.emit({ row, key, value: this.editValue });
    this.editing = null;
    this.editValue = '';
  }

  cancelEdit() {
    this.editing = null;
    this.editValue = '';
  }

  getTextClass(col: UiTableColumn, row: any): string | string[] | undefined {
    if (!col) return undefined;
    const tc = col.textClass as any;
    if (!tc) return undefined;
    return typeof tc === 'function' ? tc(row) : tc;
  }

  hasVisibleActions(row: any): boolean {
    return this.actions.some(act => act.show ? act.show(row) : true);
  }

  onCellButtonClick(col: UiTableColumn, row: any, evt?: Event) {
    if (evt) { try { evt.preventDefault(); evt.stopPropagation(); } catch {} }
    if (col.buttonOnClick) {
      try { col.buttonOnClick(row); } catch {}
      return;
    }
    const link = col.buttonLink ? col.buttonLink(row) : null;
    if (link) window.open(String(link), '_blank');
  }
}
