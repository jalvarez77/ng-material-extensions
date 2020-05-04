import { DataRowOutlet } from '@angular/cdk/table';
import { Directive, EventEmitter, Input, Output, Renderer2 } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ExportType } from './export-type';
import { ExcelOptions, Options, TxtOptions } from './options';
import { DataExtractorService } from './services/data-extractor.service';
import { Exporter } from './services/exporters/exporter';
import { ServiceLocatorService } from './services/service-locator.service';

/**
 * Exporter class for CdkTable. Abstracts the varying behaviors among different CdkTable implementations.
 */
@Directive()
export abstract class CdkTableExporter {

  private _exporterService: Exporter<Options>;

  @Input() hiddenColumns?: Array<number>;
  @Input() exporter?: Exporter<Options>;
  @Output() exportCompleted = new EventEmitter<void>();
  @Output() exportStarted = new EventEmitter<void>();

  /**
   * Data array which is extracted from nativeTable
   */
  private _data: Array<any>;

  private _isIterating: boolean;

  private _initialPageIndex: number;

  private _isExporting: boolean;

  private _subscription: Subscription;

  private _options?: Options;

  private _selectedRows?: Array<number>;

  private _selectAllRows: boolean;

  constructor(
    protected renderer: Renderer2,
    private serviceLocator: ServiceLocatorService,
    private dataExtractor: DataExtractorService,
    protected _cdkTable: any
  ) {}

  /**
   * Must return the number of pages of the table
   */
  public abstract getPageCount(): number;

  /**
   * Must return the number of items to display on a page
   */
  public abstract getPageSize(): number;

  /**
   * Must return the index of the current page that's displayed
   */
  public abstract getCurrentPageIndex(): number;

  /**
   * Must return the total number of items in the table
   */
  public abstract getTotalItemsCount(): number;

  /**
   * When called, the CdkTable should render the rows inside the page whose index given as parameter
   * @param index page index
   */
  public abstract goToPage(index: number): void;

  /**
   * Must return an observable that notifies the subscribers about page changes
   */
  public abstract getPageChangeObservable(): Observable<any>;

  /**
   * Triggers page event chain thus extracting and exporting all the rows in nativetables in pages
   */
  exportTable(exportType?: ExportType | 'xls' | 'xlsx' | 'csv' | 'txt' | 'json' | 'other', options?: Options | ExcelOptions | TxtOptions) {
    this.loadExporter(exportType);
    this._options = options;
    this.exportStarted.emit();
    this._isIterating = true;
    this._isExporting = true;
    this._data = new Array<any>();
    this.extractTableHeader();
    try {
      this.exportWithPagination();
    } catch (notPaginated) {
      this.exportSinglePage();
    }
  }

  toggleRow(index: number): void {
    const paginatedRowIndex: number = this.getPaginatedRowIndex(index);
    if (this._selectAllRows) {
      this._selectedRows = [...Array(this.getTotalItemsCount()).keys()].filter(x => x !== paginatedRowIndex);
      this._selectAllRows = false;
      return;
    }

    if (!!this._selectedRows?.find(x => x === paginatedRowIndex)) {
       this._selectedRows =  this._selectedRows.filter(x => x !== paginatedRowIndex);
    } else {
      this._selectedRows = [...(this._selectedRows || []), paginatedRowIndex];
      if (this._selectedRows.length === this.getTotalItemsCount()) {
        this._selectAllRows = true;
      }
    }
  }

  masterToggle(): void {
    this._selectAllRows = !this._selectAllRows;
    if (!this._selectAllRows) this._selectedRows = [];
  }

  private loadExporter(exportType: any) {
    if (exportType === ExportType.OTHER.valueOf()) {
      this._exporterService = this.exporter;
    } else {
      this._exporterService = this.serviceLocator.getService(exportType);
    }
  }

  private exportWithPagination() {
    this._initialPageIndex = this.getCurrentPageIndex();
    this.initPageHandler();
    this.goToPage(0);
  }

  private exportSinglePage() {
    this.extractDataOnCurrentPage();
    this.extractTableFooter();
    this.exportExtractedData();
  }

  private extractDataOnCurrentPage() {
    let rows = this.dataExtractor.extractRows(this._cdkTable, this.hiddenColumns);
    if (!this._selectAllRows && this._selectedRows) rows = rows.filter((_, i) => this._selectedRows.includes(this.getPaginatedRowIndex(i)));
    this._data = this._data.concat(rows);
  }

  private initPageHandler(): void {
    if (!this._subscription) {
      this._subscription = this.getPageChangeObservable().subscribe(() => {
        setTimeout(() => {
          if (this._isIterating) {
            this.extractDataOnCurrentPage();
            if (this.hasNextPage()) {
              this.nextPage();
            } else {
              this._isIterating = false;
              this.goToPage(this._initialPageIndex);
            }
          } else if (this._isExporting) {
            this._isExporting = false;
            this.extractTableFooter();
            this.exportExtractedData();
          }
        });
      });
    }
  }

  private exportExtractedData() {
    this._exporterService.export(this._data, this._options);
    this._data = new Array<any>();
    this.exportCompleted.emit();
  }

  private extractSpecialRows(outlet: DataRowOutlet) {
    this._data.push(...this.dataExtractor.extractRows(this._cdkTable, this.hiddenColumns, outlet));
  }

  private extractTableHeader() {
    this.extractSpecialRows(this._cdkTable._headerRowOutlet);
  }

  private extractTableFooter() {
    this.extractSpecialRows(this._cdkTable._footerRowOutlet);
  }

  private hasNextPage(): boolean {
    if (this.getCurrentPageIndex() < this.getPageCount() - 1) {
      return true;
    } else {
      return false;
    }
  }

  private nextPage(): void {
    this.goToPage(this.getCurrentPageIndex() + 1);
  }

  private getPaginatedRowIndex(index: number): number {
    return index + (this.getPageSize() * this.getCurrentPageIndex());
  }
}
