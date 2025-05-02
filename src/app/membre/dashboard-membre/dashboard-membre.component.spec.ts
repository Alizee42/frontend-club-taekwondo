import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardMembreComponent } from './dashboard-membre.component';

describe('DashboardMembreComponent', () => {
  let component: DashboardMembreComponent;
  let fixture: ComponentFixture<DashboardMembreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardMembreComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardMembreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
