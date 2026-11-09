import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageLessonsNotes } from './manage-lessons-notes';

describe('ManageLessonsNotes', () => {
  let component: ManageLessonsNotes;
  let fixture: ComponentFixture<ManageLessonsNotes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageLessonsNotes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageLessonsNotes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
