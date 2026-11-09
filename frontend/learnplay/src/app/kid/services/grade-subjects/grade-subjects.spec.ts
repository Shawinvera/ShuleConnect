import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http'; 
import { GradeSubjectService } from './grade-subjects';

describe('GradeSubjectService', () => {
  let service: GradeSubjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(GradeSubjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
