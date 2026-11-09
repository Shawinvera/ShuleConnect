import { TestBed } from '@angular/core/testing';

import { LearningHistory } from './learning-history';

describe('LearningHistory', () => {
  let service: LearningHistory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LearningHistory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
