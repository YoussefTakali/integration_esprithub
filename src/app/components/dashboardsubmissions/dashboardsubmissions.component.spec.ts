import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardsubmissionsComponent } from './dashboardsubmissions.component';

describe('DashboardsubmissionsComponent', () => {
  let component: DashboardsubmissionsComponent;
  let fixture: ComponentFixture<DashboardsubmissionsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DashboardsubmissionsComponent]
    });
    fixture = TestBed.createComponent(DashboardsubmissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
