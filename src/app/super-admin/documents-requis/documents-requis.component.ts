import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RequiredDocsService, RequiredDocConfig } from '../../shared/documents/required-docs.service';
import { DOC_CATALOG, labelFor as docLabelFor } from '../../shared/documents/doc-utils';

interface ClubItem { id: number; nom: string; }

@Component({
  selector: 'app-documents-requis-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documents-requis.component.html',
  styleUrls: ['./documents-requis.component.css']
})
export class DocumentsRequisSuperAdminComponent implements OnInit {
  private readonly API_BASE = environment.apiUrl;

  clubs: ClubItem[] = [];
  selectedClubId: number | null = null;

  docs: RequiredDocConfig[] = [];

  // Formulaire ajout
  newCode: string = '';
  newLabel: string = '';
  newRequired = true;
  newActive = true;
  newOrder: number | null = null;

  get codes() { return DOC_CATALOG.map(c => c.code); }
  labelFor(code: string) { return docLabelFor(code); }

  constructor(private http: HttpClient, private svc: RequiredDocsService) {}

  ngOnInit(): void {
    this.loadClubs();
  }

  loadClubs() {
    this.http.get<any[]>(`${this.API_BASE}/clubs`).subscribe({
      next: (arr) => {
        this.clubs = (arr || []).map((c: any) => ({ id: c.id, nom: c.nom }));
        if (!this.selectedClubId && this.clubs.length) {
          this.selectedClubId = this.clubs[0].id;
          this.loadDocs();
        }
      },
      error: (e) => { console.error('Erreur clubs', e); }
    });
  }

  onSelectClub() { this.loadDocs(); }

  loadDocs() {
    if (!this.selectedClubId) { this.docs = []; return; }
    this.svc.getByClub(this.selectedClubId).subscribe({
      next: (list) => { this.docs = list || []; },
      error: () => { this.docs = []; }
    });
  }

  addDoc() {
    if (!this.selectedClubId) return;
    const code = (this.newCode || '').trim();
    const label = (this.newLabel || this.labelFor(code)).trim();
    if (!code || !label) return;
    const payload: RequiredDocConfig = {
      clubId: this.selectedClubId,
      code,
      label,
      required: !!this.newRequired,
      active: !!this.newActive,
      orderIndex: this.newOrder ?? null,
    };
    this.svc.createOne(payload).subscribe({
      next: (created) => {
        this.docs = [...this.docs, created].sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        this.newCode = ''; this.newLabel = ''; this.newRequired = true; this.newActive = true; this.newOrder = null;
      },
      error: (e) => { console.error('Erreur ajout', e); }
    });
  }

  saveRow(doc: RequiredDocConfig) {
    if (!doc.id) return;
    this.svc.updateOne(doc.id, {
      code: doc.code,
      label: doc.label,
      required: doc.required,
      active: doc.active,
      orderIndex: doc.orderIndex ?? null,
    }).subscribe({
      next: (updated) => {
        this.docs = this.docs.map(d => d.id === updated.id ? updated : d)
                             .sort((a,b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      },
      error: (e) => { console.error('Erreur mise à jour', e); }
    });
  }

  deleteRow(doc: RequiredDocConfig) {
    if (!doc.id) return;
    if (!confirm(`Supprimer « ${doc.label} » ?`)) return;
    this.svc.deleteOne(doc.id).subscribe({
      next: () => { this.docs = this.docs.filter(d => d.id !== doc.id); },
      error: (e) => { console.error('Erreur suppression', e); }
    });
  }
}
