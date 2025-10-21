import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'universal-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './universal-header.component.html',
  styleUrls: ['./universal-header.component.css']
})
export class UniversalHeaderComponent {
  @Input() clubName: string = '';
  @Input() logoUrl: string = '';
  @Input() isUserLoggedIn: boolean = false;
  @Input() userName?: string;
  @Input() userAvatar?: string;
  @Input() unreadNotifications: number = 0;

  @Output() changeClub = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() goToDashboard = new EventEmitter<void>();
  @Output() goToProfile = new EventEmitter<void>();
  @Output() openNotifications = new EventEmitter<void>();
}
