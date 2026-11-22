import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ManageExamsQuizzes } from './manage-exams-quizzes';
import { LessonQuizService } from '../../../services/lesson-quiz.service';

describe('ManageExamsQuizzes', () => {
  let component: ManageExamsQuizzes;
  let fixture: ComponentFixture<ManageExamsQuizzes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageExamsQuizzes],
      providers: [{
        provide: LessonQuizService,
        useValue: {
          getQuizzes: () => of([]),
          getLessonOptions: () => of([]),
        },
      }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageExamsQuizzes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
