import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonLists } from './lesson-lists';

describe('LessonLists', () => {
  let component: LessonLists;
  let fixture: ComponentFixture<LessonLists>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonLists]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonLists);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
