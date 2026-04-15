import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent {
  @Input() icon = 'ri-inbox-line';
  @Input() title = 'Aucun contenu pour le moment';
  @Input() description = '';
  @Input() actionLabel = '';
  @Input() actionLink: string | any[] | null = null;
  @Input() compact = false;
  @Input() centered = true;

  @Output() actionClicked = new EventEmitter<void>();

  onActionClick(): void {
    this.actionClicked.emit();
  }
}
