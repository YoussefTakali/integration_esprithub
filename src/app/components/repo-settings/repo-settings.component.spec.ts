import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepoSettingsComponent } from './repo-settings.component';

describe('RepoSettingsComponent', () => {
  let component: RepoSettingsComponent;
  let fixture: ComponentFixture<RepoSettingsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RepoSettingsComponent]
    });
    fixture = TestBed.createComponent(RepoSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
