import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MembreService, Membre } from './membre.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/membres`;

describe('MembreService', () => {
  let service: MembreService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(MembreService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // MEMBRES-01 : Inscription publique d'un nouveau membre (données complètes)
  // -----------------------------------------------------------------------
  it('[MEMBRES-01] addMembreToClub – crée un membre et retourne 201', () => {
    const clubId = 1;
    const payload: Partial<Membre> = { nom: 'Durand', prenom: 'Jean' };
    const responseBody: Membre = { id: 42, nom: 'Durand', prenom: 'Jean' };

    let result: Membre | undefined;
    service.addMembreToClub(clubId, payload).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}?clubId=${clubId}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.nom).toBe('Durand');
    req.flush(responseBody);

    expect(result).toEqual(responseBody);
  });

  // -----------------------------------------------------------------------
  // MEMBRES-04 : Inscription avec champs obligatoires manquants → 400
  // -----------------------------------------------------------------------
  it('[MEMBRES-04] addMembreToClub – retour 400 si champs manquants', () => {
    const clubId = 1;
    let errorStatus = 0;

    service.addMembreToClub(clubId, {}).subscribe({
      error: err => (errorStatus = err.status)
    });

    const req = httpMock.expectOne(`${API}?clubId=${clubId}`);
    req.flush({ message: 'Nom obligatoire' }, { status: 400, statusText: 'Bad Request' });

    expect(errorStatus).toBe(400);
  });

  // -----------------------------------------------------------------------
  // MEMBRES-05 : Modification avec date de naissance incohérente → 400
  // -----------------------------------------------------------------------
  it('[MEMBRES-05] updateMembre – retour 400 si date naissance invalide', () => {
    const membre: Partial<Membre> = { id: 10, nom: 'Test', prenom: 'User', dateNaissance: '2050-01-01' };
    let errorStatus = 0;

    service.updateMembre(membre).subscribe({
      error: err => (errorStatus = err.status)
    });

    const req = httpMock.expectOne(`${API}/10`);
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'Date invalide' }, { status: 400, statusText: 'Bad Request' });

    expect(errorStatus).toBe(400);
  });

  // -----------------------------------------------------------------------
  // MEMBRES : getMembreConnecte – GET /membres/me retourne la fiche membre
  // -----------------------------------------------------------------------
  it('getMembreConnecte – retourne la fiche membre connecté', () => {
    const fiche: Membre = { id: 5, nom: 'Rolland', prenom: 'Luc' };
    let result: any = null;

    service.getMembreConnecte().subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/me`);
    expect(req.request.method).toBe('GET');
    req.flush(fiche);

    expect(result).toEqual(fiche);
  });

  // -----------------------------------------------------------------------
  // MEMBRES : getMembresPourParentConnecte – GET /membres/mes-enfants
  // -----------------------------------------------------------------------
  it('getMembresPourParentConnecte – retourne la liste des enfants', () => {
    const enfants: Membre[] = [
      { id: 1, nom: 'Petit', prenom: 'Alice' },
      { id: 2, nom: 'Petit', prenom: 'Bob' },
    ];
    let result: any = null;

    service.getMembresPourParentConnecte().subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/mes-enfants`);
    expect(req.request.method).toBe('GET');
    req.flush(enfants);

    expect(result).toEqual(enfants);
  });
});
