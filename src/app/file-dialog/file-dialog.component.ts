import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { parse } from 'papaparse';

export interface DialogData {
  csvData: unknown;
  mdIdColumn: string;
}

@Component({
  selector: 'dialog-overview-example-dialog',
  templateUrl: 'file-dialog.component.html',
})
export class FileDialogComponent {
  selectedColumn: string = '';

  constructor(
    public dialogRef: MatDialogRef<FileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  columns: string[] = [];
  fileLoaded: boolean = false;

  onFileSelected() {
    const inputNode: any = document.querySelector('#file');
    parse(inputNode.files[0], {
      skipEmptyLines: true,
      header: true,
      complete: (results) => {
        this.fileLoaded = true;
        let firstObject: Object = results.data[0] as Object;
        this.columns = Object.keys(firstObject);
        this.selectedColumn = this.columns[0];
        this.data.csvData = results.data;
        this.data.mdIdColumn = this.selectedColumn;
      },
    });
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
