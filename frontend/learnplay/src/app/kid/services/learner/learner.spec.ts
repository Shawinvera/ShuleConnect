import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { LearnerService} from './learner';

describe('LearnerService', () => {
  let service: LearnerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(LearnerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
