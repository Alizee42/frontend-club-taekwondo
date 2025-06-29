import { TestBed } from '@angular/core/testing';

import { EcheancesService } from './echeances.service';

describe('EcheancesService', () => {
  let service: EcheancesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EcheancesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
