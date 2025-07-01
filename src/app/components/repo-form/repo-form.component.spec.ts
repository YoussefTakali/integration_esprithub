import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoFormComponent } from './repo-form.component';

describe('RepoFormComponent', () => {
  let component: RepoFormComponent;
  let fixture: ComponentFixture<RepoFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepoFormComponent]
    });
    fixture = TestBed.createComponent(RepoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
