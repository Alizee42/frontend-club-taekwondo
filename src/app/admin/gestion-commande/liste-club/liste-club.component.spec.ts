import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ListeClubComponent } from './liste-club.component';

describe('ListeClubComponent', () => {
  let component: ListeClubComponent;
  let fixture: ComponentFixture<ListeClubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ListeClubComponent,
        HttpClientTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ListeClubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
