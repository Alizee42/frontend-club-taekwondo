import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionAvisComponent } from './gestion-avis.component';

describe('GestionAvisComponent', () => {
  let component: GestionAvisComponent;
  let fixture: ComponentFixture<GestionAvisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionAvisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionAvisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
