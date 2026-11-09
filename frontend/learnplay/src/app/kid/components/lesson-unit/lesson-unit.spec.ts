import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonUnit } from './lesson-unit';

describe('LessonUnit', () => {
  let component: LessonUnit;
  let fixture: ComponentFixture<LessonUnit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonUnit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonUnit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
