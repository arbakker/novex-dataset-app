import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, Sort } from '@angular/material/sort';
import { getCSWRecords, Iso19115Record } from '../lib/csw';
import { FileDialogComponent } from './file-dialog/file-dialog.component';

class Iso19115RecordDiv extends Iso19115Record {
  constructor(
    public override title: string,
    public override mdId: string,
    public override abstract: string,
    public override keywords: string[],
    public override resourceOwner: string,
    public override resourceOwnerUrl: string,
    public csvMatched: boolean = false
  ) {
    super(title, mdId, abstract, keywords, resourceOwner, resourceOwnerUrl);
  }
}
interface Dictionary<T> {
  [Key: string]: T;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'novex-dataset-app';
  displayedColumns: string[] = ['mdId', 'title', 'resourceOwner', 'keywords'];
  dataSource: Iso19115RecordDiv[] = [];
  csvData: Dictionary<string>[] = [];
  cswLoading: boolean = true;
  mdIdColumnCsv: string = '';

  constructor(public dialog: MatDialog) {}

  openDialog(): void {
    const dialogRef = this.dialog.open(FileDialogComponent, {
      data: {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.csvData = result.csvData;
      this.mdIdColumnCsv = result.mdIdColumn;

      this.csvData.map((x) => {
        let cswRecord = this.dataSource.find(
          (y) => y.mdId === x[this.mdIdColumnCsv]
        );
        if (cswRecord) {
          cswRecord.csvMatched = true;
        }
      });
      this.dataSource
        .filter((x) => !x.csvMatched)
        .map((x) => (x.csvMatched = false));
      this.displayedColumns.push('csvMatched');

      this.dataSource = this.dataSource.filter((x) => x.csvMatched);
    });
  }
  ngOnInit() {
    getCSWRecords(
      'https://www.nationaalgeoregister.nl/geonetwork/srv/dut/csw',
      'type=%27dataset%27%20AND%20keyword=%27basisset%20novex%27',
      10
    ).then((records: Iso19115Record[] | undefined) => {
      if (records === undefined) {
        return;
      }
      this.dataSource = records.map((x) => x as Iso19115RecordDiv);
      this.cswLoading = false;
    });
  }
}
