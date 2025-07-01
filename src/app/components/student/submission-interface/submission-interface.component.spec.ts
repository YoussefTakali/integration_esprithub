import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmissionInterfaceComponent } from './submission-interface.component';

describe('SubmissionInterfaceComponent', () => {
  let component: SubmissionInterfaceComponent;
  let fixture: ComponentFixture<SubmissionInterfaceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SubmissionInterfaceComponent]
    });
    fixture = TestBed.createComponent(SubmissionInterfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
