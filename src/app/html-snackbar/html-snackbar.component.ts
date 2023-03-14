import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSnackBar, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
  selector: 'app-html-snackbar',
  templateUrl: './html-snackbar.component.html',
  styleUrls: ['./html-snackbar.component.css'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class HtmlSnackbarComponent implements OnInit {
  public html: string = '';
  public error: boolean = false;

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: any,
    public snackBar: MatSnackBar
  ) {
    if (Object.keys(data).includes('html')) {
      this.html = data.html;
    }
    if (Object.keys(data).includes('error')) {
      this.error = data.error;
    }
  }

  ngOnInit(): void {}
}
