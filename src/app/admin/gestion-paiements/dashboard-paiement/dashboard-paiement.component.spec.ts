import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardPaiementComponent } from './dashboard-paiement.component';

describe('DashboardPaiementComponent', () => {
  let component: DashboardPaiementComponent;
  let fixture: ComponentFixture<DashboardPaiementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPaiementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardPaiementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
