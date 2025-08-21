import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { InscriptionsComponent } from './inscriptions.component';

describe('InscriptionsComponent', () => {
  let component: InscriptionsComponent;
  let fixture: ComponentFixture<InscriptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        InscriptionsComponent,   // standalone
        HttpClientTestingModule, // pour InscriptionsService (HttpClient)
        RouterTestingModule      // si le composant utilise le router
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InscriptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
