import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoosePlan } from './choose-plan';

describe('ChoosePlan', () => {
  let component: ChoosePlan;
  let fixture: ComponentFixture<ChoosePlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChoosePlan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoosePlan);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
