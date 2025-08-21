import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ParametresPaiementService } from './parametres-paiement.service';

describe('ParametresPaiementService', () => {
  let service: ParametresPaiementService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ParametresPaiementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
