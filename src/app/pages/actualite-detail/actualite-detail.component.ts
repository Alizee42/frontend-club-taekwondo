
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ActualiteService } from '../../services/actualite.service';
import { environment } from '../../../environments/environment';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

@Component({
  selector: 'app-actualite-detail',
  standalone: true,
  imports: [CommonModule, UiButtonComponent],
  templateUrl: './actualite-detail.component.html',
  styleUrls: ['./actualite-detail.component.css']
})
export class ActualiteDetailComponent implements OnInit {
  actualite: any = null;
  imageUrl: string = '';
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private actualiteService: ActualiteService,
    private router: Router
  ) {}

  retourActualites() {
    this.router.navigate(['/']).then(() => {
      setTimeout(() => {
        const el = document.getElementById('actualites');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.actualiteService.getById(id).subscribe({
        next: (data) => {
          this.actualite = data;
          this.imageUrl = this.resolveImageUrl(data.imageUrl);
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Actualité introuvable';
          this.loading = false;
        }
      });
    } else {
      this.error = 'Identifiant manquant';
      this.loading = false;
    }
  }

  resolveImageUrl(url: string | undefined): string {
    // Toujours préfixer par /uploads/actualites/
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    let raw = url || '';
    if (raw.startsWith('uploads/actualites/')) {
      return `${apiBase}/${raw}`;
    }
    if (raw.startsWith('actualites/')) raw = raw.replace(/^actualites\//, '');
    let full = '';
    if (!raw) {
      full = 'assets/images/dobok.jpg';
    } else if (raw.startsWith('http')) {
      full = raw;
    } else if (raw.startsWith('data:image')) {
      full = raw;
    } else {
      full = `${apiBase}/uploads/actualites/${encodeURIComponent(raw)}`;
    }
    return full;
  }
}
