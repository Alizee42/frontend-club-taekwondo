import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ContactService } from '../../services/contact.service';
import { ClubService } from '../../services/club.service';
import type { Club } from '../../services/club.service';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, UiButtonComponent]
})
export class ContactComponent implements OnDestroy {
  club: Club | null = null;
  private clubSub: Subscription;

  form: { name: string; email: string; objet: string; message: string } = {
    name: '',
    email: '',
    objet: '',
    message: ''
  };

  sending = false;

  constructor(private contactService: ContactService, private clubService: ClubService, private toast: ToastService) {
    this.club = this.clubService.getSelectedClub();
    this.clubSub = this.clubService.selectedClub$.subscribe((club: Club | null) => {
      this.club = club;
    });
  }

  ngOnDestroy(): void {
    this.clubSub.unsubscribe();
  }

  get clubDisplayName(): string {
    if (!this.club?.name) return '';
    return this.club.name.toLowerCase().includes('olympique taekwondo')
      ? this.club.name
      : `Olympique Taekwondo ${this.club.name}`;
  }

  get mapHref(): string {
    const address = this.club?.adresse || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  get phoneHref(): string {
    const phone = (this.club?.telephone || '').split('/')[0].replace(/[^\d+]/g, '');
    return `tel:${phone}`;
  }

  async onSubmit(contactForm?: NgForm): Promise<void> {
    if (this.sending) return;
    this.sending = true;

    try {
      await this.contactService.envoyer({ ...this.form, clubId: this.club?.id ?? null });
      this.toast.success('Votre message a été envoyé. Merci !');
      this.form = { name: '', email: '', objet: '', message: '' };
      contactForm?.resetForm(this.form);
    } catch {
      this.toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      this.sending = false;
    }
  }
}
