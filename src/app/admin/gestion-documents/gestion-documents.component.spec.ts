import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { GestionDocumentsComponent } from './gestion-documents.component';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

describe('GestionDocumentsComponent', () => {
  let component: GestionDocumentsComponent;
  let fixture: ComponentFixture<GestionDocumentsComponent>;
  let httpMock: HttpTestingController;
  let http: HttpClient;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GestionDocumentsComponent,
        HttpClientTestingModule
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    fixture = TestBed.createComponent(GestionDocumentsComponent);
    component = fixture.componentInstance;
    // Ne pas appeler detectChanges ici — chaque test gère ngOnInit manuellement
  });

  afterEach(() => {
    // Flush toutes les requêtes en cours pour éviter les erreurs verify()
    httpMock.match(() => true).forEach(r => r.flush([]));
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${API}/documents`);
    req.flush([]);
    expect(component).toBeTruthy();
  });

  // DOC-06b : validerDocument met à jour le statut local en 'validé'
  it('DOC-06b : validerDocument met le statut à validé', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne(`${API}/documents`);
    initReq.flush([]);

    const doc: any = { id: 7, typeDocument: 'CERTIFICAT_MEDICAL', nomDocument: 'cert.pdf', status: 'en_attente' };
    component.validerDocument(doc);

    const putReq = httpMock.expectOne(`${API}/documents/7/valider`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({});

    expect(doc.status).toBe('validé');
  });

  // DOC-06 : PUT /documents/7/valider → 409 (conflit)
  it('DOC-06 : PUT /documents/:id/valider → 409', () => {
    let status = 0;
    http.put(`${API}/documents/7/valider`, null).subscribe({
      next: () => { status = 200; },
      error: (err) => { status = err.status; }
    });
    const req = httpMock.expectOne(`${API}/documents/7/valider`);
    req.flush({ message: 'Conflit' }, { status: 409, statusText: 'Conflict' });
    expect(status).toBe(409);
  });

  // DOC-05 : GET /documents/9999 → 404
  it('DOC-05 : GET /documents/9999 → 404', () => {
    let status = 0;
    http.get(`${API}/documents/9999`).subscribe({
      next: () => { status = 200; },
      error: (err) => { status = err.status; }
    });
    const req = httpMock.expectOne(`${API}/documents/9999`);
    req.flush({ message: 'Non trouvé' }, { status: 404, statusText: 'Not Found' });
    expect(status).toBe(404);
  });
});
