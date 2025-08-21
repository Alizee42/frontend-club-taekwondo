import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GalerieService } from './galerie.service';

describe('GalerieService', () => {
  let service: GalerieService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(GalerieService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
