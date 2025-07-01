import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoSelectorComponent } from './repo-selector.component';

describe('RepoSelectorComponent', () => {
  let component: RepoSelectorComponent;
  let fixture: ComponentFixture<RepoSelectorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepoSelectorComponent]
    });
    fixture = TestBed.createComponent(RepoSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
