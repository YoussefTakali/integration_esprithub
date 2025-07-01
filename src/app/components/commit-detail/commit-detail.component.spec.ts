import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommitDetailComponent } from './commit-detail.component';

describe('CommitDetailComponent', () => {
  let component: CommitDetailComponent;
  let fixture: ComponentFixture<CommitDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CommitDetailComponent]
    });
    fixture = TestBed.createComponent(CommitDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
