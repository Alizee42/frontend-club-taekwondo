import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AjoutPaiementComponent } from './ajout-paiement.component';

describe('AjoutPaiementComponent', () => {
  let component: AjoutPaiementComponent;
  let fixture: ComponentFixture<AjoutPaiementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AjoutPaiementComponent,
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AjoutPaiementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
