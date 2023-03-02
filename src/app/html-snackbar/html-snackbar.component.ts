import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSnackBar, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
  selector: 'app-html-snackbar',
  templateUrl: './html-snackbar.component.html',
  styleUrls: ['./html-snackbar.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class HtmlSnackbarComponent implements OnInit {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: any,
    public snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}
}
