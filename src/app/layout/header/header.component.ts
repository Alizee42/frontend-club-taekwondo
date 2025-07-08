import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Assurez-vous que CommonModule est importé
import { PanierService } from '../../services/panier.service';
import { StripeService } from '../../services/stripe.service';
import { CommandeService } from '../../services/commande.service';
import { Produit } from '../../services/panier.service';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  // État du menu et des dropdowns
  menuOpen: boolean = false;
  dropdownOpenClub: boolean = false;
  profileMenuOpen: boolean = false;
  panierOpen: boolean = false;

  // État utilisateur et panier
  isLoggedIn: boolean = false;
  user: { id: number; nom: string; prenom: string } | null = null;
  panier: Produit[] = [];
  cartCount: number = 0;

  // État des modales et messages
  showPaiementModal: boolean = false;
  showConfirmationModal: boolean = false;
  confirmationMessage: string = '';

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

    // Abonnement aux changements du compteur de panier
    this.panierService.cartCount$.subscribe((count) => {
      this.cartCount = count;
    });

    // Abonnement aux changements du panier
    this.panierService.panier$.subscribe((panier) => {
      this.panier = panier;
    });
  }

  // Gestion des menus
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
    } else {
      console.warn(`Section avec l'ID "${sectionId}" introuvable.`);
    }
  }

  // Navigation
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
    this.fermerConfirmationModal(); // Ferme la modale si elle est ouverte
  }

  // Gestion de l'utilisateur
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

  // Gestion du panier
  supprimerDuPanier(index: number): void {
    this.panier.splice(index, 1);
    this.panierService.setPanier(this.panier);
  }

  // Paiement par CB
  payerParCB(): void {
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
  
    console.log('[HeaderComponent] Données de paiement envoyées à Stripe :', paiementData); // Log ajouté ici
  
    this.stripeService.createPaymentIntent(paiementData).then((response: any) => {
      console.log('[HeaderComponent] Réponse de Stripe :', response); // Log ajouté ici
      this.stripeService.clientSecret = response.clientSecret;
      this.showPaiementModal = true;
      setTimeout(() => this.monterStripeElement(), 0);
    }).catch((err: any) => {
      console.error('[HeaderComponent] Erreur lors du paiement Stripe :', err);
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

   async validerPaiement(): Promise<void> {
    if (!this.user) return;
  
    const commandeDTO = this.creerCommandeDTO('CB');
    console.log('[HeaderComponent] Données de commande envoyées au backend :', commandeDTO); // Log ajouté ici
  
    const result = await this.stripeService.confirmerPaiement();
    console.log('[HeaderComponent] Résultat de la confirmation de paiement :', result); // Log ajouté ici
  
    if (result.success) {
      this.commandeService.creerCommandeAvecLignes(commandeDTO).subscribe({
        next: () => {
          this.confirmationMessage = '✅ Paiement effectué avec succès ! Merci pour votre achat.';
          console.log('[HeaderComponent] Commande créée avec succès.'); // Log ajouté ici
          this.panierService.viderPanier();
          this.panier = [];
          this.cartCount = 0;
          this.showPaiementModal = false;
        },
        error: (err: any) => {
          this.confirmationMessage = '❌ Paiement validé mais erreur lors de la commande. Contactez le club.';
          console.error('[HeaderComponent] Erreur lors de la création de la commande :', err);
        }
      });
    } else {
      this.confirmationMessage = '❌ Paiement refusé : ' + result.message;
      console.warn('[HeaderComponent] Paiement refusé :', result.message);
    }
  }

  // Paiement au club
        payerAuClub(): void {
      if (!this.isUserConnected()) {
        alert('Veuillez vous connecter pour passer une commande.');
        return;
      }
      if (this.panier.length === 0) {
        alert('Votre panier est vide.');
        return;
      }
    
      const commandeDTO = this.creerCommandeDTO('CLUB');
      console.log('[HeaderComponent] Données de commande envoyées pour paiement au club :', commandeDTO); // Log ajouté ici
    
      this.commandeService.creerCommandeEnAttente(commandeDTO).subscribe({
        next: () => {
          this.confirmationMessage = '✅ Commande enregistrée avec succès ! Paiement au club.';
          console.log('[HeaderComponent] Commande enregistrée avec succès pour paiement au club.'); // Log ajouté ici
          this.showConfirmationModal = true;
          this.panierService.viderPanier();
          this.panier = [];
          this.cartCount = 0;
        },
        error: (err: any) => {
          console.error('[HeaderComponent] Erreur lors de la commande :', err);
          alert('Une erreur est survenue. Veuillez réessayer.');
        }
      });
    }
  
  fermerConfirmationModal(): void {
    this.showConfirmationModal = false;
    this.confirmationMessage = ''; // Réinitialise le message de confirmation
  }

  // Création de commande
  private creerCommandeDTO(modePaiement: string): any {
    const statutInitial = modePaiement === 'CB' ? 'PAYEE' : 'EN_ATTENTE';
    const commande = {
      utilisateurId: this.user?.id,
      modePaiement: modePaiement,
      statut: statutInitial, // Ajouter le statut initial
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
  
    console.log('[HeaderComponent] Commande générée :', commande);
    return commande;
  }

  isUserConnected(): boolean {
    return !!localStorage.getItem('token') && !!localStorage.getItem('user');
  }

  closeAllModals(): void {
    this.confirmationMessage = '';
    this.showPaiementModal = false;
    this.showConfirmationModal = false;
  }
}