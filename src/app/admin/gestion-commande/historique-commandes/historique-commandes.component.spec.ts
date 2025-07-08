import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriqueCommandesComponent } from './historique-commandes.component';

describe('HistoriqueCommandesComponent', () => {
  let component: HistoriqueCommandesComponent;
  let fixture: ComponentFixture<HistoriqueCommandesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriqueCommandesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoriqueCommandesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
