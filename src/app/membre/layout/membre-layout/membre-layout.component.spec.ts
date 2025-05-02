import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembreLayoutComponent } from './membre-layout.component';

describe('MembreLayoutComponent', () => {
  let component: MembreLayoutComponent;
  let fixture: ComponentFixture<MembreLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembreLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembreLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
