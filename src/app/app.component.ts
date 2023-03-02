import { compileNgModule } from '@angular/compiler';
import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, Sort } from '@angular/material/sort';
import { filter } from 'rxjs';
import {
  csvMatched,
  Dictionary,
  Filter,
  Iso19115Record,
  Iso19115RecordDiv,
} from 'src/lib/models';
import { getCSWRecords } from '../lib/csw';
import { FileDialogComponent } from './file-dialog/file-dialog.component';
import { FilterDialogComponent } from './filter-dialog/filter-dialog.component';
import { saveAs } from 'file-saver';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HtmlSnackbarComponent } from './html-snackbar/html-snackbar.component';

export function nameOf<T>(name: Extract<keyof T, string>): string {
  return name;
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'novex-dataset-app';
  cswEndpoint = 'https://www.nationaalgeoregister.nl/geonetwork/srv/dut/csw';
  displayedColumns: string[] = ['mdId', 'title', 'resourceOwner', 'keywords'];
  dataSource: Iso19115RecordDiv[] = [];
  dataView: Iso19115RecordDiv[] = [];
  csvData: Dictionary<string>[] = [];
  cswLoading: boolean = true;
  mdIdColumnCsv: string = '';
  cqlQuery: string = "type='dataset' AND keyword='basisset novex'";

  filters: Filter[] = [];

  constructor(public dialog: MatDialog, private _snackBar: MatSnackBar) {}

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action);
  }

  filterActive(filterColumn: string) {
    let filter = this.filters.find((x) => x.filterColumn === filterColumn);
    if (filter && filter.filterValues.length > 0) {
      return true;
    } else {
      return false;
    }
  }
  openFilterDialog(filterColumn: string, filters: Filter[]): void {
    let filter = filters.find((x) => x.filterColumn === filterColumn);

    const dialogRef = this.dialog.open(FilterDialogComponent, {
      data: {
        column: filterColumn,
        dataSource: this.dataSource,
        filter: filter,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      let filterValues: string[] = result as string[];
      let filter: Filter = {
        filterColumn: filterColumn,
        filterValues: filterValues,
      };
      this.filters = this.filters.filter(
        (x) => x.filterColumn !== filter.filterColumn
      );
      if (filter.filterValues.length > 0) {
        this.filters.push(filter);
      }
      this.dataView = this.dataSource.filter((x) => {
        for (let myFilter of this.filters) {
          const myproperty = myFilter.filterColumn as keyof Iso19115RecordDiv;
          return myFilter.filterValues.includes(x[myproperty] as string);
        }
        if (this.filters.length === 0) {
          return true;
        } else {
          return false;
        }
      });
    });
  }
  downloadResultSet(): void {
    let data = this.dataView;
    const replacer = (
      value: string | boolean | null | undefined | csvMatched | string[]
    ) => {
      if (value === null || value === undefined) {
        return '""';
      }
      if (Array.isArray(value)) {
        let arrVAl: Object[] = value;
        return `"${arrVAl.join(',')}"`;
      }
      if (typeof value === 'string') {
        return `"${value.replace('"', '""')}"`;
      }
      return JSON.stringify(value);
    }; // specify how you want to handle null values here

    const header = Object.getOwnPropertyNames(data[0]);
    let csv = data.map((record) =>
      header
        .map((fieldName) => {
          const myproperty = fieldName as keyof Iso19115RecordDiv;
          return replacer(record[myproperty]);
        })
        .join(',')
    );
    csv.unshift(header.map((x) => `"${x}"`).join(','));
    let csvArray = csv.join('\r\n');
    var blob = new Blob([csvArray], { type: 'text/csv' });
    saveAs(blob, 'myFile.csv');
    // download JSON
    // TODO: add dialog to choose download formats
    // var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    // saveAs(blob, 'myFile.json');
  }

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
          cswRecord.csvMatched = csvMatched.True;
          x['csvMatched'] = 'true';
        }
      });
      this.csvData
        .filter((x) => !Object.keys(x).includes('csvMatched'))
        .map((x) => (x['csvMatched'] = 'false'));

      let csvRecordsNotMatched = this.csvData.filter(
        (x) => x['csvMatched'] === 'false'
      );
      this.dataSource
        .filter((x) => x.csvMatched !== csvMatched.True)
        .map((x) => (x.csvMatched = csvMatched.False));
      csvRecordsNotMatched.map((x) => {
        let record = new Iso19115RecordDiv();
        record.mdId = x[this.mdIdColumnCsv];
        record.csvMatched = csvMatched.RecordNotInCatalog;
        this.dataSource.push(record);
      });

      this.displayedColumns.push('csvMatched');
    });
  }
  public get csvMatched() {
    return csvMatched;
  }

  getMatchedClass(element: Iso19115RecordDiv) {
    if (this.csvData.length > 0) {
      switch (element.csvMatched) {
        case csvMatched.True:
          return 'inCsv';
        case csvMatched.False:
          return 'notInCsv';
        case csvMatched.RecordNotInCatalog:
          return 'notInNGR';
        default:
          return '';
      }
    } else {
      return '';
    }
  }

  sortRecords(a: Iso19115RecordDiv, b: Iso19115RecordDiv): number {
    if (a.title === undefined && b.title === undefined) {
      return 0;
    }
    if (a.title === undefined && b.title !== undefined) {
      return -1;
    }
    if (a.title !== undefined && b.title === undefined) {
      return 1;
    }

    if (a.title!.toLowerCase() < b.title!.toLowerCase()) {
      return -1;
    }
    if (a.title!.toLowerCase() > b.title!.toLowerCase()) {
      return 1;
    }
    return 0;
  }
  ngOnInit() {
    getCSWRecords(this.cswEndpoint, encodeURIComponent(this.cqlQuery)).then(
      (records: Iso19115Record[] | undefined) => {
        if (records === undefined) {
          return;
        }
        this.dataSource = records
          .map((x) => x as Iso19115RecordDiv)
          .sort(this.sortRecords);
        this.dataView = this.dataSource;
        this.cswLoading = false;

        let url = `${
          this.cswEndpoint
        }?request=GetRecords&Service=CSW&Version=2.0.2&typeNames=gmd:MD_Metadata&resultType=results&constraint=${encodeURIComponent(
          this.cqlQuery
        )}&constraintLanguage=CQL_TEXT&constraint_language_version=1.1.0&outputSchema=http://www.isotc211.org/2005/gmd&elementSetName=full`;

        this._snackBar.openFromComponent(HtmlSnackbarComponent, {
          data: {
            html: `<p>Retrieved ${this.dataSource.length} metadata records from NGR with <a  href="${url}">query</a>:</p><pre><code>${this.cqlQuery}</code></pre>`,
          },
        });
      }
    );
  }
}
