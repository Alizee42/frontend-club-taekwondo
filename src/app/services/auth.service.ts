import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Utilisateur {
  id: number;
  nom: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/utilisateurs'; // Backend

  constructor(private http: HttpClient) {}

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

    login(credentials: { email: string; password: string }): void {
    this.http.post(`${this.apiUrl}/login`, credentials).subscribe({
      next: (response: any) => {
        console.log('✅ Réponse du backend :', response);
  
        // Nettoyer le localStorage avant de stocker les nouvelles données
        localStorage.clear();
  
        // Enregistrer les nouvelles données
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
  
        if (response.role) {
          localStorage.setItem('role', response.role);
        }
  
        if (response.utilisateur) {
          localStorage.setItem('utilisateur', JSON.stringify(response.utilisateur));
        }
  
        console.log('📥 Données utilisateur stockées :', response);
      },
      error: (err) => {
        console.error('❌ Erreur de connexion :', err);
        alert('Échec de la connexion. Vérifiez vos identifiants.');
      }
    });
  }
  
  logout(): void {
    localStorage.clear();
  }

  isConnecte(): boolean {
    return !!localStorage.getItem('email');
  }

  getUtilisateurConnecte(): any {
    const user = localStorage.getItem('utilisateur');
       console.log('📥 Données stockées dans localStorage :', localStorage.getItem('utilisateur'));
    return user ? JSON.parse(user) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('token'); // toujours utile si tu ajoutes un token plus tard
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }
}
