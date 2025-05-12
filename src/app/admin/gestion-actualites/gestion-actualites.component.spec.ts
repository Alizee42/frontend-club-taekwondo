import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionActualitesComponent } from './gestion-actualites.component';

describe('GestionActualitesComponent', () => {
  let component: GestionActualitesComponent;
  let fixture: ComponentFixture<GestionActualitesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionActualitesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionActualitesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
