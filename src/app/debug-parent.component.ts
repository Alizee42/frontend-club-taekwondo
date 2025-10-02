import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { MembreService } from './services/membre.service';

@Component({
  selector: 'app-debug-parent',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; background: #f5f5f5; margin: 20px; border-radius: 8px;">
      <h2>🔍 Debug Parent-Enfants</h2>
      
      <div style="margin: 20px 0;">
        <h3>Configuration</h3>
        <p><strong>Environment:</strong> {{ environment.production ? 'Production' : 'Development' }}</p>
        <p><strong>API URL:</strong> {{ environment.apiUrl }}</p>
        <p><strong>Token présent:</strong> {{ !!getToken() }}</p>
        <p><strong>User Agent:</strong> {{ getUserAgent() }}</p>
      </div>

      <button (click)="testEnfants()" [disabled]="loading" 
              style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin: 10px;">
        {{ loading ? 'Test en cours...' : 'Tester récupération enfants' }}
      </button>

      <button (click)="testDebugEndpoint()" [disabled]="loading"
              style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; margin: 10px;">
        Tester endpoint debug
      </button>

      <div *ngIf="results.length > 0" style="margin-top: 20px;">
        <h3>Résultats des tests</h3>
        <div *ngFor="let result of results" style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
          <h4>{{ result.test }}</h4>
          <p><strong>Status:</strong> {{ result.success ? '✅ Succès' : '❌ Échec' }}</p>
          <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ result.data | json }}</pre>
        </div>
      </div>
    </div>
  `
})
export class DebugParentComponent implements OnInit {
  environment = environment;
  loading = false;
  results: any[] = [];

  constructor(
    private http: HttpClient,
    private membreService: MembreService
  ) {}

  ngOnInit() {
    console.log('[DEBUG] Composant de debug initialisé');
    console.log('[DEBUG] Environment:', this.environment);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserAgent(): string {
    return navigator.userAgent;
  }

  private addResult(test: string, success: boolean, data: any) {
    this.results.unshift({ test, success, data, timestamp: new Date() });
  }

  testEnfants() {
    this.loading = true;
    console.log('[DEBUG] Test récupération enfants...');

    this.membreService.getMembresPourParentConnecte().subscribe({
      next: (enfants) => {
        console.log('[DEBUG] Résultat enfants:', enfants);
        this.addResult('GET /mes-enfants', true, enfants);
        this.loading = false;
      },
      error: (error) => {
        console.error('[DEBUG] Erreur enfants:', error);
        this.addResult('GET /mes-enfants', false, error);
        this.loading = false;
      }
    });
  }

  testDebugEndpoint() {
    this.loading = true;
    console.log('[DEBUG] Test endpoint debug...');

    this.membreService.debugParentEnfants().subscribe({
      next: (result) => {
        console.log('[DEBUG] Résultat debug:', result);
        this.addResult('GET /debug/parent-enfants', true, result);
        this.loading = false;
      },
      error: (error) => {
        console.error('[DEBUG] Erreur debug:', error);
        this.addResult('GET /debug/parent-enfants', false, error);
        this.loading = false;
      }
    });
  }
}