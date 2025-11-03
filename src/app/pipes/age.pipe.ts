import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'age',
  standalone: true
})
export class AgePipe implements PipeTransform {
  transform(dateNaissance: string | Date | undefined): number | null {
    if (!dateNaissance) return null;
    const naissance = new Date(dateNaissance);
    const now = new Date();
    let age = now.getFullYear() - naissance.getFullYear();
    const m = now.getMonth() - naissance.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < naissance.getDate())) {
      age--;
    }
    return age;
  }
}
