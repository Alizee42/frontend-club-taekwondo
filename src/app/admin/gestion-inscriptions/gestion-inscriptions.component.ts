import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-gestion-inscriptions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-inscriptions.component.html',
  styleUrls: ['./gestion-inscriptions.component.css']
})
export class GestionInscriptionsComponent implements OnInit {
  utilisateurs: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadInscriptions();
  }

  loadInscriptions(): void {
    this.http.get<any[]>('/api/utilisateurs').pipe(
      switchMap(utilisateurs => {
        const membresRequest = this.http.get<any[]>('/api/membres');
        return membresRequest.pipe(
          map(membres => {
            return utilisateurs.map(utilisateur => {
              return {
                ...utilisateur,
                membres: membres.filter(m => m.utilisateurId === utilisateur.id)
              };
            });
          })
        );
      })
    ).subscribe(result => {
      this.utilisateurs = result;
    });
  }
}
