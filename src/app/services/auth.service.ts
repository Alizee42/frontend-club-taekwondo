import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/utilisateurs'; // URL du backend

  constructor(private http: HttpClient) {}

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(credentials: { email: string; password: string }) {
    this.http.post('http://localhost:8080/api/utilisateurs/login', credentials).subscribe({
      next: (response: any) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('role', response.role); // Stocker le rôle
        console.log('Connexion réussie :', response);
      },
      error: (err) => {
        console.error('Erreur lors de la connexion :', err);
        alert('Échec de la connexion. Veuillez vérifier vos identifiants.');
      }
    });
  }
}