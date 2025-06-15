import { TestBed } from '@angular/core/testing';

import { PaymentAdminService } from './payment-admin.service';

describe('PaymentAdminService', () => {
  let service: PaymentAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
