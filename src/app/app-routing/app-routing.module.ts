import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes, ExtraOptions } from '@angular/router';
import { HelpPageComponent } from '../help-page/help-page.component';
import { CswTableComponent } from '../csw-table/csw-table.component';
const routerOptions: ExtraOptions = {
  scrollPositionRestoration: 'enabled',
  anchorScrolling: 'enabled',
  scrollOffset: [0, 64],
};
const routes: Routes = [
  { path: 'help', component: HelpPageComponent },
  { path: '', component: CswTableComponent },
  { path: '',   redirectTo: '/', pathMatch: 'full' }, 
];
@NgModule({
  imports: [CommonModule, RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
