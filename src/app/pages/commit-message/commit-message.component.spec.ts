import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitMessageComponent } from './commit-message.component';

describe('CommitMessageComponent', () => {
  let component: CommitMessageComponent;
  let fixture: ComponentFixture<CommitMessageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CommitMessageComponent]
    });
    fixture = TestBed.createComponent(CommitMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
