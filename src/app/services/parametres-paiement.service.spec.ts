import { TestBed } from '@angular/core/testing';

import { ParametresPaiementService } from './parametres-paiement.service';

describe('ParametresPaiementService', () => {
  let service: ParametresPaiementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParametresPaiementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
