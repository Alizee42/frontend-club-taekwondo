import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActualiteService } from './actualite.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/actualites`;

describe('ActualiteService', () => {
  let service: ActualiteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ActualiteService]
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ActualiteService);
    // Flush l'appel reloadActualites() du constructeur
    const initReq = httpMock.match(API);
    initReq.forEach(r => r.flush([]));
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // ACTU-02 : Publication d'une actualité par admin
  // -----------------------------------------------------------------------
  it('[ACTU-02] create – POST /actualites crée l\'actualité', () => {
    const payload = { titre: 'Compétition', contenu: 'Résultats' };
    let result: any;

    service.create(payload).subscribe(r => (result = r));

    const reqPost = httpMock.expectOne(API);
    expect(reqPost.request.method).toBe('POST');
    reqPost.flush({ id: '5', ...payload });

    // reloadActualites() déclenché par tap dans create()
    const reqGet = httpMock.match(API);
    reqGet.forEach(r => r.flush([{ id: '5', ...payload }]));

    expect(result.titre).toBe('Compétition');
  });

  // -----------------------------------------------------------------------
  // ACTU-04 : Mise à jour d'une actualité
  // -----------------------------------------------------------------------
  it('[ACTU-04-actualite] update – PUT /actualites/:id met à jour l\'actualité', () => {
    const update = { titre: 'Modifié', contenu: 'Nouveau contenu' };
    let result: any;

    service.update('5', update).subscribe(r => (result = r));

    const reqPut = httpMock.expectOne(`${API}/5`);
    expect(reqPut.request.method).toBe('PUT');
    reqPut.flush({ id: '5', ...update });

    // reloadActualites() déclenché par tap dans update()
    const reqGet = httpMock.match(API);
    reqGet.forEach(r => r.flush([{ id: '5', ...update }]));

    expect(result.titre).toBe('Modifié');
  });

  // -----------------------------------------------------------------------
  // ACTU-05 : Publication sans titre → 400
  // -----------------------------------------------------------------------
  it('[ACTU-05] create – retour 400 si titre manquant', () => {
    let errorReceived = false;

    service.create({ contenu: 'Sans titre' }).subscribe({ error: () => (errorReceived = true) });

    const req = httpMock.expectOne(API);
    req.flush({ message: 'Titre obligatoire' }, { status: 400, statusText: 'Bad Request' });
    expect(errorReceived).toBeTrue();
  });

  // -----------------------------------------------------------------------
  // ACTU-07 : Membre tente de supprimer une actualité → 403
  // -----------------------------------------------------------------------
  it('[ACTU-07] delete – retour 403 pour un membre', () => {
    let errorStatus = 0;

    service.delete('5').subscribe({ error: err => (errorStatus = err.status ?? 403) });

    const reqDel = httpMock.expectOne(`${API}/5`);
    reqDel.flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
  });

  // -----------------------------------------------------------------------
  // ACTU : Lecture par ID
  // -----------------------------------------------------------------------
  it('getById – GET /actualites/:id retourne l\'actualité', () => {
    let result: any;
    service.getById('5').subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/5`);
    req.flush({ id: '5', titre: 'Test' });
    expect(result.id).toBe('5');
  });
});

