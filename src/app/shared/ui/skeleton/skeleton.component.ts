import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type SkeletonVariant = 'text' | 'rect' | 'circle';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton.component.html',
  styleUrls: ['./skeleton.component.css']
})
export class SkeletonComponent {
  @Input() lines = 1;
  @Input() width: string | string[] = '100%';
  @Input() height = '';
  @Input() variant: SkeletonVariant = 'text';

  get lineIndexes(): number[] {
    const count = Math.max(1, Math.floor(Number(this.lines) || 1));
    return Array.from({ length: count }, (_, index) => index);
  }

  get resolvedHeight(): string {
    if (this.variant === 'circle' && !this.height) {
      return '2.75rem';
    }

    if (!this.height) {
      return this.variant === 'rect' ? '4rem' : '1rem';
    }

    return this.height;
  }

  getLineWidth(index: number): string {
    if (Array.isArray(this.width)) {
      return this.width[index] ?? this.width[this.width.length - 1] ?? '100%';
    }

    if (this.variant === 'circle') {
      return this.width || this.resolvedHeight;
    }

    if (this.variant === 'text' && this.lineIndexes.length > 1 && index === this.lineIndexes.length - 1 && this.width === '100%') {
      return '72%';
    }

    return this.width || '100%';
  }
}
