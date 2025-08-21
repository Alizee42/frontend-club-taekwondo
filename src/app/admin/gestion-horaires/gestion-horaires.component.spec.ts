import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { GestionHorairesComponent } from './gestion-horaires.component';

describe('GestionHorairesComponent', () => {
  let component: GestionHorairesComponent;
  let fixture: ComponentFixture<GestionHorairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GestionHorairesComponent,
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionHorairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
