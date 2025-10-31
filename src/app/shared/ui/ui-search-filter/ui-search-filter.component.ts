import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-search-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-search-filter.component.html',
  styleUrls: ['./ui-search-filter.component.css']
})
export class UiSearchFilterComponent {
  @Input() placeholder: string = 'Rechercher...';
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.valueChange.emit(val);
  }
}
