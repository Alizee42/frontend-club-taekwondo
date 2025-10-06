import { Injectable } from '@angular/core';

export interface Club {
  id: string;
  name: string;
  logo?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class ClubService {
  private clubs: Club[] = [
    {
      id: 'villeurbanne',
      name: 'Olympique Taekwondo Villeurbanne',
      adresse: '4 Rue De Bat Yam, 69100 Villeurbanne',
      telephone: '06 63 97 89 26 / 07 65 82 67 72',
      email: 'taekwondovilleurbannais@gmail.com'
    },
    {
      id: 'villards',
      name: 'Olympique Taekwondo Villards-les-Dombes',
      adresse: 'Gymnase des Dombes, 01330 Villards-les-Dombes',
      telephone: '06 12 34 56 78',
      email: 'taekwondo.villards@gmail.com'
    },
    {
      id: 'bourg',
      name: 'Olympique Taekwondo Bourg-en-Bresse',
      adresse: '12 Avenue Maginot, 01000 Bourg-en-Bresse',
      telephone: '06 23 45 67 89',
      email: 'taekwondo.bourg@gmail.com'
    },
    {
      id: 'amberieux',
      name: 'Olympique Taekwondo Ambérieux',
      adresse: 'Salle Polyvalente, 01500 Ambérieux',
      telephone: '06 98 76 54 32',
      email: 'taekwondo.amberieux@gmail.com'
    }
  ];

  getClubs(): Club[] {
    return this.clubs;
  }

  getSelectedClub(): Club | null {
    const club = localStorage.getItem('selectedClub');
    return club ? JSON.parse(club) : null;
  }

  setSelectedClub(club: Club) {
    localStorage.setItem('selectedClub', JSON.stringify(club));
  }

  clearSelectedClub() {
    localStorage.removeItem('selectedClub');
  }
}
