import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { UnitContent } from './unit-content';
import { LessonQuizService } from '../../../services/lesson-quiz.service';

describe('UnitContent', () => {
  let component: UnitContent;
  let fixture: ComponentFixture<UnitContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitContent],
      providers: [{
        provide: LessonQuizService,
        useValue: {
          getForLesson: () => of(null),
          submit: () => of({
            score: 0,
            questionCount: 0,
            percentage: 0,
            passed: false,
            attemptCount: 1,
          }),
        },
      }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnitContent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
