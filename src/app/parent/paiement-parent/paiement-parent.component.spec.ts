import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PaiementParentComponent } from './paiement-parent.component';

describe('PaiementParentComponent', () => {
  let component: PaiementParentComponent;
  let fixture: ComponentFixture<PaiementParentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaiementParentComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PaiementParentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
