import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorairesComponent } from './horaires.component';

describe('HorairesComponent', () => {
  let component: HorairesComponent;
  let fixture: ComponentFixture<HorairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorairesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HorairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
