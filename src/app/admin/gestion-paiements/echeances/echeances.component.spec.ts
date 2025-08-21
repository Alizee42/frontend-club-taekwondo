import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EcheancesComponent } from './echeances.component';

describe('EcheancesComponent', () => {
  let component: EcheancesComponent;
  let fixture: ComponentFixture<EcheancesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        EcheancesComponent,
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EcheancesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
