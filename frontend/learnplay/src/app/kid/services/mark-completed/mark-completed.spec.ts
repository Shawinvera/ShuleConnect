import { TestBed } from '@angular/core/testing';

import { MarkCompletedService } from './mark-completed';

describe('MarkCompleted', () => {
  let service: MarkCompletedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MarkCompletedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
 });
