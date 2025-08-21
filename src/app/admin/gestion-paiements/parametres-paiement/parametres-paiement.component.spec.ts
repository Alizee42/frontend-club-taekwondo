import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ParametresPaiementComponent } from './parametres-paiement.component';

describe('ParametresPaiementComponent', () => {
  let component: ParametresPaiementComponent;
  let fixture: ComponentFixture<ParametresPaiementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ParametresPaiementComponent,
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ParametresPaiementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
