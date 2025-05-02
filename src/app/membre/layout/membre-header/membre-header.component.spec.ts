import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembreHeaderComponent } from './membre-header.component';

describe('MembreHeaderComponent', () => {
  let component: MembreHeaderComponent;
  let fixture: ComponentFixture<MembreHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembreHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembreHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
