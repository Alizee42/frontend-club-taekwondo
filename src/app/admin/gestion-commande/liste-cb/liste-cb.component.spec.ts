import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListeCbComponent } from './liste-cb.component';

describe('ListeCbComponent', () => {
  let component: ListeCbComponent;
  let fixture: ComponentFixture<ListeCbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListeCbComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListeCbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
