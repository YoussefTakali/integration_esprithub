import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoCodeComponent } from './repo-code.component';

describe('RepoCodeComponent', () => {
  let component: RepoCodeComponent;
  let fixture: ComponentFixture<RepoCodeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepoCodeComponent]
    });
    fixture = TestBed.createComponent(RepoCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
