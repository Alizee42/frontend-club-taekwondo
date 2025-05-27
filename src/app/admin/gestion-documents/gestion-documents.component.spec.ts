import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionDocumentsComponent } from './gestion-documents.component';

describe('GestionDocumentsComponent', () => {
  let component: GestionDocumentsComponent;
  let fixture: ComponentFixture<GestionDocumentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionDocumentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
