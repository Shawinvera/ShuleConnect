import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnitContent } from './unit-content';

describe('UnitContent', () => {
  let component: UnitContent;
  let fixture: ComponentFixture<UnitContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitContent]
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
