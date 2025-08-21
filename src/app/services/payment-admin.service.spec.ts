import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PaymentAdminService } from './payment-admin.service';

describe('PaymentAdminService', () => {
  let service: PaymentAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PaymentAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
