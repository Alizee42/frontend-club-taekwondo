import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-kpi-grid',
  standalone: true,
  imports: [],
  templateUrl: './kpi-grid.component.html',
  styleUrls: ['./kpi-grid.component.css']
})
export class KpiGridComponent {
  /** Nombre de colonnes sur desktop (≥ 1024px). Défaut : 4. */
  @Input() cols = 4;
}
