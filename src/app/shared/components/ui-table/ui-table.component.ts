import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UiTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'custom';
  cellClass?: string;
  render?: (row: any) => string;
}

@Component({
  selector: 'ui-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-table.component.html',
  styleUrls: ['./ui-table.component.css']
})
export class UiTableComponent {
  @Input() columns: UiTableColumn[] = [];
  @Input() data: any[] = [];
  @Input() actions: Array<{ label: string; icon?: string; iconText?: string; action: string; color?: string }> = [];
  @Output() actionClick = new EventEmitter<{ action: string; row: any }>();

  onAction(action: string, row: any) {
    this.actionClick.emit({ action, row });
  }
}
