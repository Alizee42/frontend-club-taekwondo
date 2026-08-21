import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { ConnexionComponent } from './connexion.component';

describe('ConnexionComponent', () => {
  let component: ConnexionComponent;
  let fixture: ComponentFixture<ConnexionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ConnexionComponent,    // ✅ standalone
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConnexionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait créer le composant', () => {
    expect(component).toBeTruthy();
  });

  it('devrait contenir un champ email', () => {
    const emailInput = fixture.debugElement.query(By.css('input[type="email"]'));
    expect(emailInput).toBeTruthy();
  });

  it('devrait contenir un champ mot de passe', () => {
    const passwordInput = fixture.debugElement.query(By.css('input[type="password"]'));
    expect(passwordInput).toBeTruthy();
  });

  it('devrait désactiver le bouton si le formulaire est invalide', () => {
    component.email = '';
    component.password = '';
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
    expect(button.disabled).toBeTrue();
  });

  it('devrait basculer l’affichage du mot de passe', () => {
    const toggleBtn = fixture.debugElement.query(By.css('.toggle-password')).nativeElement;
    const passwordInput: HTMLInputElement = fixture.debugElement.query(By.css('#password')).nativeElement;

    // Par défaut -> password
    expect(passwordInput.type).toBe('password');

    // Clique sur le bouton -> text
    toggleBtn.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('text');
  });
});
