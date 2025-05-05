import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionProfesseursComponent } from './gestion-professeurs.component';

describe('GestionProfesseursComponent', () => {
  let component: GestionProfesseursComponent;
  let fixture: ComponentFixture<GestionProfesseursComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionProfesseursComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionProfesseursComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
