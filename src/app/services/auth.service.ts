import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Utilisateur {
  id: number;
  nom: string;
  email?: string;
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
    console.log('Email fourni :', credentials.email);
    console.log('Mot de passe fourni :', credentials.password);
  
    this.http.post(`${this.apiUrl}/login`, credentials).subscribe({
      next: (response: any) => {
        console.log('Réponse du backend :', response);
  
        if (response.utilisateur) {
          localStorage.setItem('utilisateur', JSON.stringify(response.utilisateur));
          localStorage.setItem('token', response.token);
          localStorage.setItem('role', response.role);
  
          console.log('✅ Utilisateur connecté :', response.utilisateur);
        } else {
          console.error('❌ Utilisateur non retourné dans la réponse backend.');
        }
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
    return !!localStorage.getItem('token');
  }

  getUtilisateurConnecte(): any {
    const user = localStorage.getItem('utilisateur');
    console.log('Utilisateur dans localStorage :', user); // ← vérifie bien ce log
    return user ? JSON.parse(user) : null;
  }
  

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }
}
