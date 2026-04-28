import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CoreModule } from '../core/core.module';  // ← IMPORTANT

import { MenuComponent } from './layout/menu.component';
import { FooterComponent } from './layout/footer.component';
import { LayoutComponent } from './layout/layout.component';

@NgModule({
  declarations: [
    MenuComponent,
    FooterComponent,
    LayoutComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    CoreModule  // ← Ajouté pour que LayoutComponent connaisse HeaderComponent
  ],
  exports: [
    MenuComponent,
    FooterComponent,
    LayoutComponent
  ]
})
export class SharedModule { }
