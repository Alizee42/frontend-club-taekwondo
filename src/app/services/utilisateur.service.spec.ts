import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UtilisateurService } from './utilisateur.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/utilisateurs`;

describe('UtilisateurService', () => {
  let service: UtilisateurService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UtilisateurService]
    });
    service = TestBed.inject(UtilisateurService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // PROFIL-02 : Mise à jour du profil utilisateur
  // -----------------------------------------------------------------------
  it('[PROFIL-02] update – PUT /utilisateurs/:id met à jour le profil', () => {
    const user = { id: 5, nom: 'Martin', prenom: 'Luc', email: 'luc@test.com' };
    let result: any;

    service.update(user).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/5`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...user, nom: 'Martin' });
    expect(result.nom).toBe('Martin');
  });

  // -----------------------------------------------------------------------
  // PROFIL-03 : Email invalide lors de la mise à jour → 400
  // -----------------------------------------------------------------------
  it('[PROFIL-03] update – retour 400 si email invalide', () => {
    const user = { id: 5, nom: 'Test', email: 'pas_un_email' };
    let errorStatus = 0;

    service.update(user).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(`${API}/5`);
    req.flush({ message: 'Email invalide' }, { status: 400, statusText: 'Bad Request' });
    expect(errorStatus).toBe(400);
  });

  // -----------------------------------------------------------------------
  // USER-01 : Création d'un utilisateur avec rôle ADMIN
  // -----------------------------------------------------------------------
  it('[USER-01] add – POST /utilisateurs crée un utilisateur ADMIN', () => {
    const payload = { nom: 'Admin', prenom: 'Super', email: 'admin@test.com', role: 'ADMIN' };
    let result: any;

    service.add(payload).subscribe(r => (result = r));

    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, ...payload });
    expect(result.id).toBe(10);
    expect(result.role).toBe('ADMIN');
  });

  // -----------------------------------------------------------------------
  // USER-02 : Mise à jour d'un utilisateur existant
  // -----------------------------------------------------------------------
  it('[USER-02] update – PUT /utilisateurs/:id modifie les données', () => {
    const user = { id: 3, nom: 'Modifié', prenom: 'User', email: 'user@test.com' };
    let result: any;

    service.update(user).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/3`);
    req.flush(user);
    expect(result.nom).toBe('Modifié');
  });

  // -----------------------------------------------------------------------
  // USER-04 : Email déjà utilisé → 409
  // -----------------------------------------------------------------------
  it('[USER-04] add – retour 409 si email existant', () => {
    const payload = { nom: 'Test', prenom: 'User', email: 'existant@test.com' };
    let errorStatus = 0;

    service.add(payload).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(API);
    req.flush({ message: 'Email déjà utilisé' }, { status: 409, statusText: 'Conflict' });
    expect(errorStatus).toBe(409);
  });

  // -----------------------------------------------------------------------
  // USER-05 : Suppression d'un utilisateur inexistant → 404
  // -----------------------------------------------------------------------
  it('[USER-05] delete – retour 404 si utilisateur inexistant', () => {
    let errorStatus = 0;

    service.delete(9999).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(`${API}/9999`);
    req.flush({ message: 'Utilisateur introuvable' }, { status: 404, statusText: 'Not Found' });
    expect(errorStatus).toBe(404);
  });
});
