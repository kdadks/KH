declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  type TableCell = string | number | boolean | null | undefined;
  interface StyleOptions { [key: string]: string | number | boolean | undefined; }
  interface AutoTableOptions {
    head?: TableCell[][];
    body?: TableCell[][];
    foot?: TableCell[][];
    startY?: number;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    pageBreak?: 'auto' | 'avoid' | 'always';
    rowPageBreak?: 'auto' | 'avoid';
    tableWidth?: 'auto' | 'wrap' | number;
    showHead?: 'everyPage' | 'firstPage' | 'never';
    showFoot?: 'everyPage' | 'lastPage' | 'never';
    tableLineWidth?: number;
    tableLineColor?: string | number[];
    theme?: 'striped' | 'grid' | 'plain';
    styles?: StyleOptions;
    headStyles?: StyleOptions;
    bodyStyles?: StyleOptions;
    footStyles?: StyleOptions;
    alternateRowStyles?: StyleOptions;
    columnStyles?: { [key: string]: StyleOptions };
    [key: string]: unknown;
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
  export default autoTable;
}
