import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-dashboard-card',
  imports: [CommonModule],
  template: `
    <button type="button"
            [ngClass]="hostClasses"
            (click)="onClick()"
            [attr.aria-label]="ariaLabel || title"
            [disabled]="disabled || loading">
      <span class="badge" *ngIf="badge !== null && !loading">{{ badge }}</span>
      <div class="icon-container" aria-hidden="true">
        <div class="icon-ring" *ngIf="!loading"></div>
        <i [class]="icon" [class.icon-faded]="loading"></i>
      </div>
      <h3 class="card-title" *ngIf="!loading; else skelTitle">{{ title }}</h3>
      <p class="card-desc" *ngIf="!loading; else skelDesc">{{ description }}</p>
      <ng-template #skelTitle><span class="skeleton skeleton-title"></span></ng-template>
      <ng-template #skelDesc>
        <span class="skeleton skeleton-line"></span>
        <span class="skeleton skeleton-line short"></span>
      </ng-template>
      <div class="progress-wrapper" *ngIf="progress !== null && !loading">
        <div class="progress-bar"><div class="progress-fill" [style.width.%]="progress"></div></div>
        <span class="progress-value">{{ progress }}%</span>
      </div>
    </button>
  `,
  styles: [`
  .dashboard-card-btn { background: linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05)); padding: 1.35rem 1.25rem 1.4rem; border-radius: 20px; box-shadow: 0 6px 14px -4px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.06); text-decoration: none; color: var(--text-main, #1e293b); transition: transform .28s cubic-bezier(.4,.55,.2,1), box-shadow .45s ease, background .45s ease, border-color .45s ease; position: relative; overflow: hidden; width: 100%; cursor: pointer; display: flex; flex-direction: column; align-items: center; text-align: center; isolation: isolate; backdrop-filter: blur(10px) saturate(150%);
    --border-alpha: 0.55;
    --border-grad: linear-gradient(135deg, rgba(255,138,61,var(--border-alpha)) 0%, rgba(255,84,0,var(--border-alpha)) 45%, rgba(255,255,255,0.35) 100%);
    border: 1px solid rgba(255,255,255,0.18);
}
  /* Layer border effect */
  .dashboard-card-btn::before { content:""; position:absolute; inset:0; padding:1px; border-radius:inherit; background:var(--border-grad); -webkit-mask:
      linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude; opacity:.85; transition:opacity .5s ease; pointer-events:none; }
  /* Retrait du fond radial global pour un rendu plus neutre */
  .dashboard-card-btn::after { display:none; }
  .dashboard-card-btn:hover::before { opacity:1; }
  .dashboard-card-btn:focus-visible::before { opacity:1; }
  .dashboard-card-btn:focus-visible { outline: 3px solid var(--orange-main); outline-offset: 4px; }
  .dashboard-card-btn:hover:not(:disabled) { transform: translateY(-6px); box-shadow: 0 16px 28px -6px rgba(0,0,0,0.32), 0 4px 10px rgba(0,0,0,0.18); }
  .dashboard-card-btn:active:not(:disabled) { transform: translateY(-1px); }
  .dashboard-card-btn:disabled { opacity: .55; cursor: not-allowed; }
  /* Remove old pseudo base bg replaced by layered system */
  /* Variantes */
  .variant-accent { background: linear-gradient(135deg, var(--orange-main,#ff7a1f), #ff5400); color:#fff; border-color: rgba(255,255,255,0.25); }
  .variant-accent .card-title { color:#fff; }
  .variant-outline { background:rgba(255,255,255,0.04); border:1px solid var(--blue-main,#134074); }
  .variant-glass { background:rgba(255,255,255,0.16); border:1px solid rgba(255,255,255,0.38); }
  .variant-accent::before { --border-alpha:1; }
  .is-highlight::before { opacity:1; box-shadow:0 0 0 4px rgba(255,138,61,0.25); }
  .is-highlight::after { content:""; position:absolute; inset:-6px; border-radius:inherit; background:radial-gradient(circle at 40% 30%, rgba(255,138,61,0.45), transparent 70%); filter:blur(14px); opacity:.9; pointer-events:none; }
  .is-subtle { box-shadow:none; backdrop-filter: blur(4px); }
  .is-highlight { box-shadow:0 0 0 2px rgba(255,255,255,0.3), 0 0 0 6px rgba(255,123,0,0.25); }
  .icon-container { font-size:2.3rem; color: var(--red-main, #dc2626); margin: 0 0 .75rem; display:flex; align-items:center; justify-content:center; position:relative; }
  .icon-ring { position:absolute; width:64px; height:64px; border-radius:50%; background: conic-gradient(from 180deg at 50% 50%, var(--orange-main,#ff8a3d), transparent 55%); filter: blur(18px) opacity(.55); animation: ringPulse 5s linear infinite; pointer-events:none; }
  @keyframes ringPulse { 0% { transform:scale(.65) rotate(0deg); opacity:.55;} 50%{opacity:.35;} 100% { transform:scale(.95) rotate(360deg); opacity:.55;} }
  .card-title { margin:0 0 .4rem; color: var(--blue-main, #0f3e74); font-size:1.15rem; font-weight:600; letter-spacing:.5px; }
  .card-desc { margin:0; font-size:.9rem; line-height:1.3; color: var(--text-secondary, #475569); }
  .badge { position:absolute; top:10px; right:12px; background: linear-gradient(135deg, var(--orange-main,#ff8a3d), #e35a00); color:#fff; font-size:.65rem; padding:.3rem .5rem; border-radius:999px; font-weight:600; letter-spacing:.5px; box-shadow:0 2px 6px rgba(0,0,0,.25); }
  /* Skeleton */
  .skeleton { display:block; width:100%; background:linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.28), rgba(255,255,255,0.15)); background-size:200% 100%; animation: shimmer 1.2s linear infinite; border-radius:6px; height:14px; margin:.25rem 0; }
  .skeleton-title { height:20px; width:70%; margin:0 auto .5rem; }
  .skeleton-line.short { width:55%; }
  @keyframes shimmer { 0% { background-position:200% 0;} 100% { background-position:-200% 0; } }
  .is-loading .icon-container i { opacity:.3; filter:grayscale(1); }
  /* Progress */
  .progress-wrapper { width:100%; margin-top:.85rem; display:flex; flex-direction:column; gap:.35rem; align-items:stretch; }
  .progress-bar { position:relative; height:6px; background:rgba(255,255,255,0.2); width:100%; border-radius:4px; overflow:hidden; }
  .progress-fill { position:absolute; left:0; top:0; bottom:0; background:linear-gradient(90deg, var(--orange-main,#ff8a3d), #ff5400); box-shadow:0 0 0 1px rgba(255,255,255,0.2); transition:width .4s cubic-bezier(.4,.6,.2,1); }
  .progress-value { font-size:.65rem; font-weight:600; letter-spacing:.5px; text-transform:uppercase; opacity:.75; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardCardComponent {
  @Input() icon: string = 'ri-file-line';
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() badge: number | null = null; // null => pas d'affichage
  @Input() disabled: boolean = false;
  @Input() ariaLabel: string | null = null;
  @Input() loading: boolean = false;
  @Input() progress: number | null = null;
  @Input() variant: 'default' | 'accent' | 'outline' | 'glass' = 'default';
  @Input() subtle: boolean = false;
  @Input() highlight: boolean = false;

  @Output() action = new EventEmitter<void>();

  get hostClasses(): string[] {
    const classes = ['dashboard-card-btn', `variant-${this.variant}`];
    if (this.subtle) classes.push('is-subtle');
    if (this.highlight) classes.push('is-highlight');
    if (this.loading) classes.push('is-loading');
    return classes;
  }

  onClick(): void {
    if (this.disabled || this.loading) return;
    this.action.emit();
  }
}
