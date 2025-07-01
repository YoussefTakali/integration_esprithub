import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentcardComponent } from './assignmentcard.component';

describe('AssignmentcardComponent', () => {
  let component: AssignmentcardComponent;
  let fixture: ComponentFixture<AssignmentcardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AssignmentcardComponent]
    });
    fixture = TestBed.createComponent(AssignmentcardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
