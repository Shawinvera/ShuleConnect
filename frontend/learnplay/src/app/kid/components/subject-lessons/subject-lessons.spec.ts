import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectLessons } from './subject-lessons';

describe('SubjectLessons', () => {
  let component: SubjectLessons;
  let fixture: ComponentFixture<SubjectLessons>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectLessons]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubjectLessons);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
