import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface PageHeaderBreadcrumb {
  label: string;
  link?: string | any[] | null;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.css']
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() eyebrow = '';
  @Input() icon = '';
  @Input() align: 'left' | 'center' | 'right' = 'left';
  @Input() breadcrumbs: PageHeaderBreadcrumb[] = [];
}
