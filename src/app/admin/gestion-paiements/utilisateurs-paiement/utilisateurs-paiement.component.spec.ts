import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilisateursPaiementComponent } from './utilisateurs-paiement.component';

describe('UtilisateursPaiementComponent', () => {
  let component: UtilisateursPaiementComponent;
  let fixture: ComponentFixture<UtilisateursPaiementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UtilisateursPaiementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilisateursPaiementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
