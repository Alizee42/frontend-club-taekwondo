import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';
import { GestionHorairesSuperAdminModule } from './super-admin/gestion-horaires/gestion-horaires-super-admin.module';
// ... autres imports nécessaires ...

@NgModule({
  declarations: [
    AppComponent,
    // ... autres composants ...
  ],
  imports: [
    BrowserModule,
    FormsModule,
    CommonModule,
    GestionHorairesSuperAdminModule,
    // ... autres modules ...
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
