import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class ContactComponent {
  form = {
    name: '',
    email: '',
    objet: '',
    message: ''
  };
  sending = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(private contactService: ContactService) {}

  async onSubmit() {
    if (this.sending) return;
    this.successMessage = null;
    this.errorMessage = null;
    this.sending = true;
    try {
      await this.contactService.envoyer(this.form);
      this.successMessage = 'Votre message a été envoyé. Merci !';
      this.form = { name: '', email: '', objet: '', message: '' };
    } catch (e) {
      this.errorMessage = 'Une erreur est survenue. Réessayez.';
    } finally {
      this.sending = false;
    }
  }
}
