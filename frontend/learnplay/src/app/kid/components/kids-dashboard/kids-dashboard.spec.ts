import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KidsDashboard } from './kids-dashboard';

describe('KidsDashboard', () => {
  let component: KidsDashboard;
  let fixture: ComponentFixture<KidsDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KidsDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KidsDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
