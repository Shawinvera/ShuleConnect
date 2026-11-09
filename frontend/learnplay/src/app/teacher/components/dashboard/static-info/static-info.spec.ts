import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaticInfo } from './static-info';

describe('StaticInfo', () => {
  let component: StaticInfo;
  let fixture: ComponentFixture<StaticInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaticInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaticInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
