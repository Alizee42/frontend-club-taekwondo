import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContactService } from '../../services/contact.service';
import { ClubService } from '../../services/club.service';
import type { Club } from '../../services/club.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class ContactComponent {
  club: Club | null = null;
  private clubSub: any;
  form: { name: string; email: string; objet: string; message: string } = {
    name: '',
    email: '',
    objet: '',
    message: ''
  };
  sending: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(private contactService: ContactService, private clubService: ClubService) {
    this.club = this.clubService.getSelectedClub();
    this.clubSub = this.clubService.selectedClub$.subscribe((club: Club | null) => {
      this.club = club;
    });
  }
  ngOnDestroy() {
    if (this.clubSub) this.clubSub.unsubscribe();
  }

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
