import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GestionCommandeComponent } from './gestion-commande.component';

describe('GestionCommandeComponent', () => {
  let component: GestionCommandeComponent;
  let fixture: ComponentFixture<GestionCommandeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GestionCommandeComponent,
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionCommandeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
