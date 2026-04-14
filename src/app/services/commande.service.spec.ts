import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CommandeService, CommandeDTO } from './commande.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/commandes`;

describe('CommandeService', () => {
  let service: CommandeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CommandeService]
    });
    service = TestBed.inject(CommandeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // BOUT-02 : Création d'une commande avec lignes
  // -----------------------------------------------------------------------
  it('[BOUT-02] creerCommandeAvecLignes – POST /commandes/with-lignes retourne la commande', () => {
    const payload = {
      utilisateurId: 1,
      lignes: [{ produitId: 10, quantite: 2, produitNom: 'Dobok', prix: 49.99 }]
    };
    const response: Partial<CommandeDTO> = { id: 55, statut: 'EN_ATTENTE', montantTotal: 99.98 };
    let result: any;

    service.creerCommandeAvecLignes(payload).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/with-lignes`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
    expect(result.id).toBe(55);
  });

  // -----------------------------------------------------------------------
  // BOUT-04 : Validation d'une commande par admin
  // -----------------------------------------------------------------------
  it('[BOUT-04] validerCommande – PUT /commandes/:id/valider change le statut', () => {
    let called = false;

    service.validerCommande(55).subscribe(() => (called = true));

    const req = httpMock.expectOne(`${API}/55/valider`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);
    expect(called).toBeTrue();
  });

  // -----------------------------------------------------------------------
  // BOUT-05 : Commande avec produit sans stock suffisant → 409
  // -----------------------------------------------------------------------
  it('[BOUT-05] validerCommande – retour 409 si stock insuffisant', () => {
    let errorMsg = '';

    service.validerCommande(99).subscribe({ error: err => (errorMsg = err.message ?? '') });

    const req = httpMock.expectOne(`${API}/99/valider`);
    req.flush({ message: 'Stock insuffisant' }, { status: 409, statusText: 'Conflict' });
    expect(errorMsg).toContain('409');
  });

  // -----------------------------------------------------------------------
  // BOUT-06 : Commande avec panier vide → 400
  // -----------------------------------------------------------------------
  it('[BOUT-06] creerCommandeAvecLignes – retour 400 si panier vide', () => {
    let errorMsg = '';

    service.creerCommandeAvecLignes({ utilisateurId: 1, lignes: [] }).subscribe({
      error: err => (errorMsg = err.message ?? '')
    });

    const req = httpMock.expectOne(`${API}/with-lignes`);
    req.flush({ message: 'Panier vide' }, { status: 400, statusText: 'Bad Request' });
    expect(errorMsg).toContain('400');
  });

  // -----------------------------------------------------------------------
  // BOUT-09 : Membre essaie de valider une commande → 403
  // -----------------------------------------------------------------------
  it('[BOUT-09] getCommandes – retour 403 pour un membre', () => {
    let errorMsg = '';

    service.getCommandes().subscribe({ error: err => (errorMsg = err.message ?? '') });

    const req = httpMock.expectOne(API);
    req.flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(errorMsg).toContain('403');
  });
});

