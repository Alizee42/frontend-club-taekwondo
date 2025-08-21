import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { EvenementsListeComponent } from './evenements-liste.component';

describe('EvenementsListeComponent', () => {
  let component: EvenementsListeComponent;
  let fixture: ComponentFixture<EvenementsListeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        EvenementsListeComponent, // standalone
        HttpClientTestingModule,  // fournit HttpClient mocké
        RouterTestingModule       // si le composant utilise le router
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EvenementsListeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
