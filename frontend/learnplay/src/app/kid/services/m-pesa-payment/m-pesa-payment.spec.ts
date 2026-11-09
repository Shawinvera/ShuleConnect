import { TestBed } from '@angular/core/testing';

import { MPesaPaymentService } from './m-pesa-payment';

describe('MPesaPayment', () => {
  let service: MPesaPaymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MPesaPaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
