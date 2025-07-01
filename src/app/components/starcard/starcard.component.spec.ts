import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StarcardComponent } from './starcard.component';

describe('StarcardComponent', () => {
  let component: StarcardComponent;
  let fixture: ComponentFixture<StarcardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StarcardComponent]
    });
    fixture = TestBed.createComponent(StarcardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
