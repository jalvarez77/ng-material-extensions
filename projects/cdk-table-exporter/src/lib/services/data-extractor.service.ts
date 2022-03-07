import { Injectable } from '@angular/core';
import { DataRowOutlet } from '@angular/cdk/table';

@Injectable({
  providedIn: 'root'
})
export class DataExtractorService {

  constructor() { }

  public extractRows(cdkTable: any, hiddenColumns: Array<any>, outlet?: DataRowOutlet): Array<any> {
    return this.getRowsAsJsonArray(cdkTable, hiddenColumns, outlet ?? cdkTable._rowOutlet);
  }

  private getRowsAsJsonArray(cdkTable: any, hiddenColumns: Array<any>, outlet: DataRowOutlet): Array<any> {
    const renderedRows = this.getRenderedRows(cdkTable, outlet);
    return this.convertToJsonArray(hiddenColumns, renderedRows);
  }

  private getRenderedRows(cdkTable: any, outlet: DataRowOutlet): HTMLTableRowElement[] {
    return cdkTable._getRenderedRows(outlet) as HTMLTableRowElement[];
  }

  private convertToJsonArray(hiddenColumns: Array<any>, rows: HTMLTableRowElement[]): Array<any> {
    const result = new Array<any>();
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < rows.length; i++) {
      const row: Array<string> = this.convertRow(hiddenColumns, rows[i]);
      result.push(this.createExcelItem(row));
    }
    return result;
  }

  private convertRow(hiddenColumns: Array<any>, row: HTMLTableRowElement): Array<string> {
    const result = new Array<string>();
    const cells: any = row.children;
    for (let i = 0; i < cells.length; i++) {
      if (!this.shouldHide(hiddenColumns, i)) {
        const element = (cells.item(i).innerText).trim();
        result.push(element);
      }
    }
    return result;
  }

  private shouldHide(hiddenColumns: Array<any>, columnIndex: number) {
    let result = false;
    hiddenColumns.forEach(item=>{
      if (item==columnIndex) {
        result = true;
      }
    })
    return result;
  }

  private createExcelItem(row: Array<string>): any {
    return Object.assign({}, row);
  }
}
