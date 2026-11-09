import { TestBed } from '@angular/core/testing';

import { LearnersSummary } from './learners-summary';

describe('LearnersSummary', () => {
  let service: LearnersSummary;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LearnersSummary);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
