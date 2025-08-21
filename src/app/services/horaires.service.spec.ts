import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HorairesService } from './horaires.service';

describe('HorairesService', () => {
  let service: HorairesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(HorairesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
