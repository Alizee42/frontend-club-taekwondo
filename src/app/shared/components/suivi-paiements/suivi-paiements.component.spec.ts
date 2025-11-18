import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SuiviPaiementsComponent } from './suivi-paiements.component';

describe('SuiviPaiementsComponent', () => {
  let component: SuiviPaiementsComponent;
  let fixture: ComponentFixture<SuiviPaiementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SuiviPaiementsComponent,
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuiviPaiementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
