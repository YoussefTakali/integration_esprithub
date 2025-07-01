import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGithubInfoComponent } from './add-github-info.component';

describe('AddGithubInfoComponent', () => {
  let component: AddGithubInfoComponent;
  let fixture: ComponentFixture<AddGithubInfoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddGithubInfoComponent]
    });
    fixture = TestBed.createComponent(AddGithubInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
