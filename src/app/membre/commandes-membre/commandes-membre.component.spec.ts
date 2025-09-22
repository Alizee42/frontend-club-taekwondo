import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CommandesMembreComponent } from './commandes-membre.component';

describe('CommandesMembreComponent', () => {
  let component: CommandesMembreComponent;
  let fixture: ComponentFixture<CommandesMembreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommandesMembreComponent, // ✅ standalone
        HttpClientTestingModule   // ✅ fournit HttpClient mocké pour les tests
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommandesMembreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
