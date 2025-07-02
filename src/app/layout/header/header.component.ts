import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PanierService } from '../../services/panier.service';
import { StripeService } from '../../services/stripe.service'; // Import du service Stripe
import { CommandeService } from '../../services/commande.service'; // Import du service Commande

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

  constructor(
    private router: Router,
    private panierService: PanierService,
    private stripeService: StripeService, // Injection du service Stripe
    private commandeService: CommandeService // Injection du service Commande
  ) {}
  ngOnInit(): void {
    this.checkLoginStatus(); // Vérifie si l'utilisateur est connecté
    const storedUser = localStorage.getItem('user');
    console.log('Stored user:', storedUser); // Log des données utilisateur
    if (storedUser) {
      this.user = JSON.parse(storedUser); // Charge les informations utilisateur
    }
  
    this.panier = this.panierService.getPanier(); // Charge le panier
    this.cartCount = this.panierService.getCartCount(); // Met à jour le compteur du panier
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
    console.log('Token:', token); // Vérifiez si le token est présent
    console.log('Stored user:', storedUser); // Vérifiez si les données utilisateur sont présentes
    this.isLoggedIn = !!token && !!storedUser; // Met à jour isLoggedIn
    console.log('isLoggedIn:', this.isLoggedIn); // Ajoutez un log pour vérifier la valeur
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
      this.closeMenu(); // facultatif : referme le menu mobile après clic
    }
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.cart-icon') &&
      !target.closest('.cart-preview')
    ) {
      this.panierOpen = false; // Ferme le dropdown du panier
    }
  }
supprimerDuPanier(index: number): void {
  this.panier.splice(index, 1); // Supprime l'élément du panier
  this.panierService.setPanier(this.panier); // Met à jour le panier dans le service
  this.cartCount = this.panier.length; // Met à jour le compteur du panier
}

payerParCB(): void {
  const utilisateur = this.user; // Récupération de l'utilisateur connecté
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
    modePaiement: 'CB',
    lignesCommande: this.panier.map(p => ({
      produitId: p.id,
      quantite: p.quantite,
      prixUnitaire: p.prix / p.quantite,
      sousTotal: p.prix,
      taille: p.taille,
      couleur: p.couleur,
      flocage: p.flocage
    }))
  };

  const paiementData = {
    amount: this.panier.reduce((total, p) => total + p.prix, 0),
    currency: 'eur',
    typePaiement: 'unique',
    modePaiement: 'CB'
  };

  this.stripeService.createPaymentIntent(paiementData).then((response: any) => {
    const clientSecret = response.clientSecret;
    this.stripeService.redirectToCheckout(clientSecret).then(() => {
      this.commandeService.creerCommandeAvecLignes(commandeDTO).subscribe({
        next: () => {
          alert('Commande enregistrée avec succès ! Paiement par CB.');
          this.panierService.viderPanier(); // Vider le panier après la commande
          this.panier = []; // Réinitialiser le panier dans le header
          this.cartCount = 0; // Réinitialiser le compteur du panier
        },
        error: (err: any) => {
          console.error('❌ Erreur lors de la commande :', err);
          alert('Une erreur est survenue. Veuillez réessayer.');
        }
      });
    });
  }).catch((err: any) => {
    console.error('❌ Erreur lors du paiement Stripe :', err);
    alert('Une erreur est survenue lors du paiement. Veuillez réessayer.');
  });
}

payerAuClub(): void {
  const utilisateur = this.user; // Récupération de l'utilisateur connecté
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
      produitId: p.id,
      quantite: p.quantite,
      prixUnitaire: p.prix / p.quantite,
      sousTotal: p.prix,
      taille: p.taille,
      couleur: p.couleur,
      flocage: p.flocage
    }))
  };

  this.commandeService.creerCommandeEnAttente(commandeDTO).subscribe({
    next: () => {
      alert('Commande enregistrée avec succès ! Paiement au club.');
      this.panierService.viderPanier(); // Vider le panier après la commande
      this.panier = []; // Réinitialiser le panier dans le header
      this.cartCount = 0; // Réinitialiser le compteur du panier
    },
    error: (err: any) => {
      console.error('❌ Erreur lors de la commande :', err);
      alert('Une erreur est survenue. Veuillez réessayer.');
    }
  });
}

commander(modePaiement: string): void {
  const utilisateur = this.user; // Utilisateur récupéré depuis localStorage
  console.log('Utilisateur connecté récupéré :', utilisateur);

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
    modePaiement: modePaiement, // Ajout du mode de paiement
    lignesCommande: this.panier.map(p => ({
      produitId: p.id,
      quantite: p.quantite,
      prixUnitaire: p.prix / p.quantite, // Prix unitaire
      sousTotal: p.prix
    }))
  };

  console.log('✅ Commande envoyée au backend :', commandeDTO);

  this.panierService.commander(commandeDTO).subscribe({
    next: () => {
      alert(`Commande enregistrée avec succès ! Mode de paiement : ${modePaiement}`);
      this.panierService.viderPanier(); // Vider le panier après la commande
      this.panier = []; // Réinitialiser le panier dans le header
      this.cartCount = 0; // Réinitialiser le compteur du panier
    },
    error: err => {
      console.error('❌ Erreur lors de la commande :', err);
      alert('Une erreur est survenue. Veuillez réessayer.');
    }
  });
}

isUserConnected(): boolean {
  const token = localStorage.getItem('token'); // Vérifie si un token est présent
  const storedUser = localStorage.getItem('user'); // Vérifie si les informations utilisateur sont présentes
  return !!token && !!storedUser; // Retourne true si les deux existent
}

}