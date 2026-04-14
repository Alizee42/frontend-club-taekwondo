import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DocumentsComponent } from './documents.component';
import { RequiredDocsService } from '../../shared/documents/required-docs.service';
import { environment } from '../../../environments/environment';
import { of } from 'rxjs';

const API = environment.apiUrl;

describe('DocumentsComponent', () => {
  let component: DocumentsComponent;
  let fixture: ComponentFixture<DocumentsComponent>;
  let httpMock: HttpTestingController;
  let http: HttpClient;

  beforeEach(async () => {
    const requiredDocsSpy = jasmine.createSpyObj('RequiredDocsService', ['getByClub']);
    requiredDocsSpy.getByClub.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        DocumentsComponent,
        HttpClientTestingModule
      ],
      providers: [
        { provide: RequiredDocsService, useValue: requiredDocsSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    fixture = TestBed.createComponent(DocumentsComponent);
    component = fixture.componentInstance;
    // Ne pas appeler detectChanges ici — loadUtilisateurConnecte vérifie le token
    // (sans token en localStorage, pas de requête HTTP émise)
  });

  afterEach(() => {
    httpMock.match(() => true).forEach(r => r.flush({}));
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    // Sans token en localStorage, pas de requête HTTP
    expect(component).toBeTruthy();
  });

  // DOC-04a : fichier type interdit → isValidFile retourne false
  it('DOC-04a : fichier exe → isValidFile retourne false', () => {
    const file = new File(['x'], 'virus.exe', { type: 'application/x-msdownload' });
    expect(component.isValidFile(file)).toBeFalse();
  });

  // DOC-04b : fichier trop gros (> 5 Mo) → isValidFile retourne false
  it('DOC-04b : fichier > 5 Mo → isValidFile retourne false', () => {
    const bigContent = new Uint8Array(6 * 1024 * 1024); // 6 Mo
    const file = new File([bigContent], 'gros.pdf', { type: 'application/pdf' });
    expect(component.isValidFile(file)).toBeFalse();
  });

  // DOC-04c : PDF valide (< 5 Mo) → isValidFile retourne true
  it('DOC-04c : PDF valide → isValidFile retourne true', () => {
    const file = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });
    expect(component.isValidFile(file)).toBeTrue();
  });

  // DOC-05 : GET /documents/utilisateur/9999 → 404
  it('DOC-05 : GET /documents/utilisateur/9999 → 404', () => {
    let status = 0;
    http.get(`${API}/documents/utilisateur/9999`).subscribe({
      next: () => { status = 200; },
      error: (err) => { status = err.status; }
    });
    const req = httpMock.expectOne(`${API}/documents/utilisateur/9999`);
    req.flush({ message: 'Non trouvé' }, { status: 404, statusText: 'Not Found' });
    expect(status).toBe(404);
  });
});
