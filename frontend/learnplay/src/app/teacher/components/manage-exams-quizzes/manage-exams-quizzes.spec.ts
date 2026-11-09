import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageExamsQuizzes } from './manage-exams-quizzes';

describe('ManageExamsQuizzes', () => {
  let component: ManageExamsQuizzes;
  let fixture: ComponentFixture<ManageExamsQuizzes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageExamsQuizzes]
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
