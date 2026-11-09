import { TestBed } from '@angular/core/testing';

import { SubscriptionTiers } from './subscription-tiers';

describe('SubscriptionTiers', () => {
  let service: SubscriptionTiers;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubscriptionTiers);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
