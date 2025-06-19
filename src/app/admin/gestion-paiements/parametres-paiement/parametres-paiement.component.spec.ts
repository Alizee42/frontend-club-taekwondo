import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParametresPaiementComponent } from './parametres-paiement.component';

describe('ParametresPaiementComponent', () => {
  let component: ParametresPaiementComponent;
  let fixture: ComponentFixture<ParametresPaiementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametresPaiementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParametresPaiementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
