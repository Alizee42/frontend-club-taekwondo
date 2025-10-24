import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GestionHorairesSuperAdminComponent } from './gestion-horaires-super-admin.component';
import { AjoutHoraireComponent } from './ajout-horaire.component';

@NgModule({
  declarations: [
    GestionHorairesSuperAdminComponent,
    AjoutHoraireComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    GestionHorairesSuperAdminComponent
  ]
})
export class GestionHorairesSuperAdminModule {}
