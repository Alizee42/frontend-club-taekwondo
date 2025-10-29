import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiIconButtonComponent } from '../../ui/buttons/ui-icon-button/ui-icon-button.component';

export interface UiTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'custom' | 'image';
  cellClass?: string;
  render?: (row: any) => string;
}

@Component({
  selector: 'ui-table',
  standalone: true,
  imports: [CommonModule, FormsModule, UiIconButtonComponent],
  templateUrl: './ui-table.component.html',
  styleUrls: ['./ui-table.component.css']
})
export class UiTableComponent {
  @Input() columns: UiTableColumn[] = [];
  @Input() data: any[] = [];
  @Input() actions: Array<{ label: string; icon?: string; iconText?: string; action: string; color?: string; variant?: 'primary'|'secondary'|'danger'|'ghost'; disabled?: boolean; customClass?: string; show?: (row: any) => boolean }> = [];
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
}
