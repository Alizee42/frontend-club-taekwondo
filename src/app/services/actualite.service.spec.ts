import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActualiteService } from './actualite.service';

describe('ActualiteService', () => {
  let service: ActualiteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ActualiteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
