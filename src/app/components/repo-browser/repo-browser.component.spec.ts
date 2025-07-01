import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoBrowserComponent } from './repo-browser.component';

describe('RepoBrowserComponent', () => {
  let component: RepoBrowserComponent;
  let fixture: ComponentFixture<RepoBrowserComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepoBrowserComponent]
    });
    fixture = TestBed.createComponent(RepoBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
