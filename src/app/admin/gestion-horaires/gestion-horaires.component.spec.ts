import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionHorairesComponent } from './gestion-horaires.component';

describe('GestionHorairesComponent', () => {
  let component: GestionHorairesComponent;
  let fixture: ComponentFixture<GestionHorairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionHorairesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionHorairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
