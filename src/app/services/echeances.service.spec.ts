import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EcheancesService } from './echeances.service';

describe('EcheancesService', () => {
  let service: EcheancesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(EcheancesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
