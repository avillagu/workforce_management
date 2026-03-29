import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { DateTime } from 'luxon';

@Injectable({ providedIn: 'root' })
export class ExcelService {
  /**
   * Export JSON to Excel Matrix
   */
  exportScheduleToExcel(
    days: { date: DateTime; label: string }[],
    empleados: any[],
    getTurnosFn: (empId: string, day: DateTime) => any[],
    formatTurnoFn: (turno: any) => string,
    filename: string
  ): void {
    const data: any[] = [];
    
    // 1. Headers (Empleado, Fecha1, Fecha2...)
    const headers = ['Empleado', ...days.map(d => d.date.toFormat('dd/MM/yyyy'))];
    data.push(headers);

    // 2. Rows
    empleados.forEach(emp => {
      const row = [emp.nombre_completo];
      days.forEach(day => {
        const turnos = getTurnosFn(emp.id, day.date);
        if (turnos.length > 0) {
          row.push(turnos.map(t => formatTurnoFn(t)).join(' / '));
        } else {
          row.push('---');
        }
      });
      data.push(row);
    });

    // 3. Workbook
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Auto-width for columns
    const wscols = headers.map(h => ({ wch: Math.max(h.length, 12) }));
    wscols[0].wch = 25; // Employee name wider
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Programación');
    
    // 4. Save
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }
}
