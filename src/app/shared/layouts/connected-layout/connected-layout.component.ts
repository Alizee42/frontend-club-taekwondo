import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router'; // ← AJOUT ICI

@Component({
  selector: 'app-connected-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, // ← AJOUT ICI

  ],
  templateUrl: './connected-layout.component.html',
  styleUrls: ['./connected-layout.component.css']
})
export class ConnectedLayoutComponent {}
