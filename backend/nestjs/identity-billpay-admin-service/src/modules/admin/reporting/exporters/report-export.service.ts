import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');
import { createObjectCsvStringifier } from 'csv-writer';

@Injectable()
export class ReportExportService {
  async exportCsv(
    reportType: string,
    data: any[],
    response: Response,
  ): Promise<void> {
    const rows = this.flattenData(data);

    if (!rows.length) {
      response.setHeader('Content-Type', 'text/csv');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${reportType}.csv"`,
      );
      response.send('');
      return;
    }

    const headers = Object.keys(rows[0]);

    const csvStringifier = createObjectCsvStringifier({
      header: headers.map((header) => ({
        id: header,
        title: header.toUpperCase(),
      })),
    });

    const csv =
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(rows);

    response.setHeader('Content-Type', 'text/csv');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${reportType}.csv"`,
    );

    response.send(csv);
  }

  async exportExcel(
    reportType: string,
    data: any[],
    response: Response,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(
      this.getSheetName(reportType),
    );

    const rows = this.flattenData(data);

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);

      worksheet.columns = headers.map((header) => ({
        header: header.toUpperCase(),
        key: header,
        width: 22,
      }));

      rows.forEach((row) => {
        worksheet.addRow(row);
      });

      worksheet.getRow(1).font = {
        bold: true,
      };

      worksheet.autoFilter = {
        from: 'A1',
        to: `${this.getColumnLetter(headers.length)}1`,
      };
    }

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${reportType}.xlsx"`,
    );

    await workbook.xlsx.write(response);

    response.end();
  }

  async exportPdf(
    reportType: string,
    data: any[],
    response: Response,
  ): Promise<void> {
    const document = new PDFDocument({
      margin: 30,
      size: 'A4',
      layout: 'landscape',
    });

    response.setHeader('Content-Type', 'application/pdf');

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${reportType}.pdf"`,
    );

    document.pipe(response);

    document
      .fontSize(18)
      .text(this.getReportTitle(reportType), {
        align: 'center',
      });

    document.moveDown();

    const rows = this.flattenData(data);

    if (!rows.length) {
      document.fontSize(12).text('No records found.');
      document.end();
      return;
    }

    const headers = Object.keys(rows[0]);

    document.fontSize(9);

    const columnWidth = 750 / headers.length;

    let y = document.y;

    headers.forEach((header, index) => {
      document
        .font('Helvetica-Bold')
        .text(
          header.toUpperCase(),
          30 + index * columnWidth,
          y,
          {
            width: columnWidth - 5,
            lineBreak: false,
          },
        );
    });

    y += 20;

    rows.forEach((row) => {
      if (y > 550) {
        document.addPage();
        y = 30;
      }

      headers.forEach((header, index) => {
        document
          .font('Helvetica')
          .text(
            String(row[header] ?? ''),
            30 + index * columnWidth,
            y,
            {
              width: columnWidth - 5,
              lineBreak: false,
            },
          );
      });

      y += 18;
    });

    document.end();
  }

  private flattenData(data: any[]): any[] {
    return data.map((item) => {
      const flattened: Record<string, any> = {};

      Object.entries(item).forEach(([key, value]) => {
        if (value !== null && typeof value === 'object') {
          flattened[key] = JSON.stringify(value);
        } else {
          flattened[key] = value;
        }
      });

      return flattened;
    });
  }

  private getSheetName(reportType: string): string {
    switch (reportType) {
      case 'daily-summary':
        return 'Daily Summary';

      case 'failed':
        return 'Failed Transactions';

      case 'high-value':
        return 'High Value';

      case 'branch-wise':
        return 'Branch Wise';

      case 'channel-wise':
        return 'Channel Wise';

      default:
        return 'Transaction Report';
    }
  }

  private getReportTitle(reportType: string): string {
    switch (reportType) {
      case 'daily-summary':
        return 'Daily Transaction Summary';

      case 'failed':
        return 'Failed Transaction Report';

      case 'high-value':
        return 'High Value Transaction Report';

      case 'branch-wise':
        return 'Branch-wise Transaction Report';

      case 'channel-wise':
        return 'Channel-wise Transaction Report';

      default:
        return 'Transaction Report';
    }
  }

  private getColumnLetter(columnNumber: number): string {
    let result = '';
    let number = columnNumber;

    while (number > 0) {
      const remainder = (number - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      number = Math.floor((number - 1) / 26);
    }

    return result;
  }
}