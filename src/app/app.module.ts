import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { FileDialogComponent } from './file-dialog/file-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FilterDialogComponent } from './filter-dialog/filter-dialog.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HtmlSnackbarComponent } from './html-snackbar/html-snackbar.component';
import { RouterTestingModule } from '@angular/router/testing';
import { CswTableComponent } from './csw-table/csw-table.component';
import { HelpPageComponent } from './help-page/help-page.component';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing/app-routing.module';
import {MatToolbarModule} from '@angular/material/toolbar'; 
import { SecurityContext } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown'; 
import { HttpClientModule, HttpClient } from '@angular/common/http'; 

@NgModule({
  declarations: [
    AppComponent,
    FileDialogComponent,
    FilterDialogComponent,
    HtmlSnackbarComponent,
    CswTableComponent,
    HelpPageComponent,
  ],
  entryComponents: [HtmlSnackbarComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterTestingModule,
    RouterModule,
    AppRoutingModule,
    HttpClientModule,
    MatToolbarModule,
      MarkdownModule.forRoot({ loader: HttpClient, sanitize: SecurityContext.NONE }) 
    ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
