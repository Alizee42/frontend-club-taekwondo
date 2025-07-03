import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PanierService } from '../../services/panier.service';
import { StripeService } from '../../services/stripe.service';
import { CommandeService } from '../../services/commande.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  menuOpen: boolean = false;
  dropdownOpenClub: boolean = false;
  profileMenuOpen: boolean = false;
  panierOpen: boolean = false;

  isLoggedIn: boolean = false;
  user: any = null;
  panier: any[] = [];
  cartCount: number = 0;

  showPaiementModal = false;
  confirmationMessage = '';

  constructor(
    private router: Router,
    private panierService: PanierService,
    public stripeService: StripeService,
    private commandeService: CommandeService
  ) {}

  ngOnInit(): void {
    this.checkLoginStatus();
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }
    this.panier = this.panierService.getPanier();
    this.cartCount = this.panierService.getCartCount();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  toggleDropdown(menu: string): void {
    if (menu === 'club') {
      this.dropdownOpenClub = !this.dropdownOpenClub;
    }
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  togglePanier(): void {
    this.panierOpen = !this.panierOpen;
  }

  goToInscription(): void {
    this.router.navigate(['/inscription']);
    this.closeMenu();
  }

  goHome(): void {
    this.router.navigate(['/']);
    this.closeMenu();
  }

  goToGalerie(): void {
    this.router.navigate(['/galerie']);
    this.closeMenu();
  }

  goToContact(): void {
    this.router.navigate(['/contact']);
    this.closeMenu();
  }

  goToConnexion(): void {
    this.router.navigate(['/connexion']);
    this.closeMenu();
  }

  goToProfil(): void {
    this.router.navigate(['/profil']);
  }

  goToDashboard(): void {
    const role = localStorage.getItem('role')?.toLowerCase();
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard-admin']);
    } else if (role === 'membre') {
      this.router.navigate(['/membre/dashboard-membre']);
    } else {
      console.error('Rôle inconnu ou non défini.');
      alert('Votre rôle est inconnu. Veuillez contacter l’administrateur.');
      this.router.navigate(['/']);
    }
  }

  goToBoutique(): void {
    this.router.navigate(['/boutique']);
    this.closeMenu();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.panierService.viderPanier();
    this.isLoggedIn = false;
    this.router.navigate(['/connexion']);
  }

  getInitials(): string {
    if (!this.user || !this.user.nom || !this.user.prenom) return '?';
    return (this.user.prenom.charAt(0) + this.user.nom.charAt(0)).toUpperCase();
  }

  checkLoginStatus(): void {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    this.isLoggedIn = !!token && !!storedUser;
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.dropdownOpenClub = false;
    this.profileMenuOpen = false;
    this.panierOpen = false;
  }

  scrollToSection(sectionId: string): void {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.closeMenu();
    }
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.cart-icon') &&
      !target.closest('.cart-preview')
    ) {
      this.panierOpen = false;
    }
  }

  supprimerDuPanier(index: number): void {
    this.panier.splice(index, 1);
    this.panierService.setPanier(this.panier);
    this.cartCount = this.panier.length;
  }

  payerParCB(): void {
    const utilisateur = this.user;
    if (!this.isUserConnected()) {
      alert('Veuillez vous connecter pour passer une commande.');
      return;
    }
    if (this.panier.length === 0) {
      alert('Votre panier est vide.');
      return;
    }

    const paiementData = {
      amount: this.panier.reduce((total, p) => total + Number(p.prix), 0),
      currency: 'eur',
      typePaiement: 'unique',
      modePaiement: 'CB'
    };

    this.stripeService.createPaymentIntent(paiementData).then((response: any) => {
      this.stripeService.clientSecret = response.clientSecret;
      this.showPaiementModal = true;
      setTimeout(() => this.monterStripeElement(), 0);
    }).catch((err: any) => {
      console.error('❌ Erreur lors du paiement Stripe :', err);
      alert('Une erreur est survenue lors du paiement. Veuillez réessayer.');
    });
  }

  fermerPaiementModal(): void {
    this.showPaiementModal = false;
    this.confirmationMessage = '';
    if (this.stripeService.cardElement) {
      this.stripeService.cardElement.unmount();
      this.stripeService.cardElement = null;
    }
  }

  monterStripeElement(): void {
    this.stripeService.monterElementDans('#modal-card-element');
  }

  async validerPaiement() {
    const utilisateur = this.user;
    const commandeDTO = {
      utilisateurId: utilisateur.id,
      modePaiement: 'CB',
      lignesCommande: this.panier.map(p => ({
        produitId: Number(p.id),
        produitNom: String(p.nom),
        quantite: Number(p.quantite),
        prixUnitaire: Number(p.prix) / Number(p.quantite),
        sousTotal: Number(p.prix),
        taille: p.taille ?? null,
        couleur: p.couleur ?? null,
        flocage: p.flocage ?? null
      }))
    };

    console.log('Commande envoyée :', commandeDTO);

    const result = await this.stripeService.confirmerPaiement();
    if (result.success) {
      this.commandeService.creerCommandeAvecLignes(commandeDTO).subscribe({
        next: () => {
          this.confirmationMessage = '✅ Paiement effectué avec succès ! Merci pour votre achat.';
          this.panierService.viderPanier();
          this.panier = [];
          this.cartCount = 0;
        },
        error: (err: any) => {
          this.confirmationMessage = '❌ Paiement validé mais erreur lors de la commande. Contactez le club.';
          console.error('❌ Erreur lors de la commande :', err);
        }
      });
    } else {
      this.confirmationMessage = '❌ Paiement refusé : ' + result.message;
    }
  }

  payerAuClub(): void {
    const utilisateur = this.user;
    if (!this.isUserConnected()) {
      alert('Veuillez vous connecter pour passer une commande.');
      return;
    }
    if (this.panier.length === 0) {
      alert('Votre panier est vide.');
      return;
    }

    const commandeDTO = {
      utilisateurId: utilisateur.id,
      modePaiement: 'CLUB',
      lignesCommande: this.panier.map(p => ({
        produitId: Number(p.id),
        produitNom: String(p.nom),
        quantite: Number(p.quantite),
        prixUnitaire: Number(p.prix) / Number(p.quantite),
        sousTotal: Number(p.prix),
        taille: p.taille ?? null,
        couleur: p.couleur ?? null,
        flocage: p.flocage ?? null
      }))
    };

    console.log('Commande envoyée :', commandeDTO);

    this.commandeService.creerCommandeEnAttente(commandeDTO).subscribe({
      next: () => {
        alert('Commande enregistrée avec succès ! Paiement au club.');
        this.panierService.viderPanier();
        this.panier = [];
        this.cartCount = 0;
      },
      error: (err: any) => {
        console.error('❌ Erreur lors de la commande :', err);
        alert('Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }

  commander(modePaiement: string): void {
    const utilisateur = this.user;
    if (!this.isUserConnected()) {
      alert('Veuillez vous connecter pour passer une commande.');
      return;
    }
    if (this.panier.length === 0) {
      alert('Votre panier est vide.');
      return;
    }

    const commandeDTO = {
      utilisateurId: utilisateur.id,
      modePaiement: modePaiement,
      lignesCommande: this.panier.map(p => ({
        produitId: Number(p.id),
        produitNom: String(p.nom),
        quantite: Number(p.quantite),
        prixUnitaire: Number(p.prix) / Number(p.quantite),
        sousTotal: Number(p.prix),
        taille: p.taille ?? null,
        couleur: p.couleur ?? null,
        flocage: p.flocage ?? null
      }))
    };

    console.log('Commande envoyée :', commandeDTO);

    this.panierService.commander(commandeDTO).subscribe({
      next: () => {
        alert(`Commande enregistrée avec succès ! Mode de paiement : ${modePaiement}`);
        this.panierService.viderPanier();
        this.panier = [];
        this.cartCount = 0;
      },
      error: err => {
        console.error('❌ Erreur lors de la commande :', err);
        alert('Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }

  isUserConnected(): boolean {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    return !!token && !!storedUser;
  }
}