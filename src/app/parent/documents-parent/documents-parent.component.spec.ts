import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsParentComponent } from './documents-parent.component';

describe('DocumentsParentComponent', () => {
  let component: DocumentsParentComponent;
  let fixture: ComponentFixture<DocumentsParentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsParentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentsParentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
