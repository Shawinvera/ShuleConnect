import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonCard } from './lesson-card';

describe('LessonCard', () => {
  let component: LessonCard;
  let fixture: ComponentFixture<LessonCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
