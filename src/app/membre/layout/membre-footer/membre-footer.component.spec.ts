import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembreFooterComponent } from './membre-footer.component';

describe('MembreFooterComponent', () => {
  let component: MembreFooterComponent;
  let fixture: ComponentFixture<MembreFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembreFooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembreFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
