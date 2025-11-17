import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GestionHorairesSuperAdminComponent } from './gestion-horaires-super-admin.component';

@NgModule({
  declarations: [GestionHorairesSuperAdminComponent],
  imports: [CommonModule, FormsModule],
  exports: [GestionHorairesSuperAdminComponent]
})
export class GestionHorairesSuperAdminModule {}
