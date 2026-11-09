import { TestBed } from '@angular/core/testing';

import { SubTopic } from './sub-topic';

describe('SubTopic', () => {
  let service: SubTopic;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubTopic);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
