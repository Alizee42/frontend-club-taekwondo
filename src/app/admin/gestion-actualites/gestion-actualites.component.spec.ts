import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GestionActualitesComponent } from './gestion-actualites.component';
// (optionnel) si le composant utilise le router :
// import { RouterTestingModule } from '@angular/router/testing';

describe('GestionActualitesComponent', () => {
  let component: GestionActualitesComponent;
  let fixture: ComponentFixture<GestionActualitesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GestionActualitesComponent,
        HttpClientTestingModule,
        // RouterTestingModule, // <= décommente si besoin
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionActualitesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
