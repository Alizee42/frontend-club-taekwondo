import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GestionGalerieComponent } from './gestion-galerie.component';

describe('GestionGalerieComponent', () => {
  let component: GestionGalerieComponent;
  let fixture: ComponentFixture<GestionGalerieComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GestionGalerieComponent,
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionGalerieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
