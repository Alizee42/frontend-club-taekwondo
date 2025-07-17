import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvenementsListeComponent } from './evenements-liste.component';

describe('EvenementsListeComponent', () => {
  let component: EvenementsListeComponent;
  let fixture: ComponentFixture<EvenementsListeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvenementsListeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvenementsListeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
