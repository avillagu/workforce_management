import { Component, input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { DateTime, Interval } from 'luxon';
import { Empleado } from '@core/models/operacion.models';
import { Turno } from '@core/models/turno.model';
import { ColombiaHolidays } from '@core/utils/colombia-holidays';

interface EmpleadoResumen {
  id: string;
  nombre: string;
  username: string;
  horasRegistradas: number;
  domingosTrabajados: number;
  festivosTrabajados: number;
  horasNocturnas: number;
  descansos: number;
  incapacidades: number;
}

@Component({
  selector: 'app-consolidado-programacion',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule],
  template: `
    <div class="consolidado-container">
      <div class="summary-grid">
        <div class="summary-card total">
          <mat-icon>timer</mat-icon>
          <div class="val">{{ totalHours() }}</div>
          <div class="lab">Horas Programadas</div>
        </div>
        <div class="summary-card sun">
          <mat-icon>celebration</mat-icon>
          <div class="val">{{ totalSundays() }}</div>
          <div class="lab">Dominicales</div>
        </div>
        <div class="summary-card night">
          <mat-icon>nights_stay</mat-icon>
          <div class="val">{{ totalNightHours().toFixed(1) }}</div>
          <div class="lab">Horas Nocturnas</div>
        </div>
      </div>

      <div class="table-card">
        <table mat-table [dataSource]="resumen()" class="premium-table">
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef> Empleado </th>
            <td mat-cell *matCellDef="let row"> 
               <div class="emp-cell">
                 <div class="avatar">{{ row.nombre.slice(0,2).toUpperCase() }}</div>
                 <div class="meta">
                   <span class="name">{{ row.nombre }}</span>
                   <span class="user">&#64;{{ row.username }}</span>
                 </div>
               </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="horas">
            <th mat-header-cell *matHeaderCellDef> Hrs Totales </th>
            <td mat-cell *matCellDef="let row" class="val-cell"> {{ row.horasRegistradas }}h </td>
          </ng-container>

          <ng-container matColumnDef="domingos">
            <th mat-header-cell *matHeaderCellDef> Domingos </th>
            <td mat-cell *matCellDef="let row" class="val-cell" [class.highlight]="row.domingosTrabajados > 0"> 
               {{ row.domingosTrabajados }} 
            </td>
          </ng-container>

          <ng-container matColumnDef="festivos">
            <th mat-header-cell *matHeaderCellDef> Festivos </th>
            <td mat-cell *matCellDef="let row" class="val-cell"> {{ row.festivosTrabajados }} </td>
          </ng-container>

          <ng-container matColumnDef="nocturnas">
            <th mat-header-cell *matHeaderCellDef> Nocturnas </th>
            <td mat-cell *matCellDef="let row" class="val-cell"> {{ row.horasNocturnas.toFixed(1) }}h </td>
          </ng-container>

          <ng-container matColumnDef="descansos">
            <th mat-header-cell *matHeaderCellDef> Descansos </th>
            <td mat-cell *matCellDef="let row" class="val-cell"> {{ row.descansos }} </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <!-- Empty State -->
        <div *ngIf="resumen().length === 0" class="empty-state">
           <mat-icon>analytics</mat-icon>
           <p>No hay datos suficientes para el período actual.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .consolidado-container { display: flex; flex-direction: column; gap: 24px; animation: fadeIn 0.4s ease-out; }
    
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .summary-card { padding: 20px; border-radius: 16px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .summary-card mat-icon { font-size: 24px; width: 24px; height: 24px; opacity: 0.8; }
    .summary-card .val { font-size: 28px; font-weight: 800; letter-spacing: -1px; }
    .summary-card .lab { font-size: 13px; font-weight: 600; text-transform: uppercase; opacity: 0.7; }
    
    .summary-card.total { background: #eff6ff; color: #1e40af; }
    .summary-card.sun { background: #fdf4ff; color: #701a75; }
    .summary-card.night { background: #1e293b; color: #f8fafc; }

    .table-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .premium-table { width: 100%; border-collapse: collapse; }
    
    .mat-mdc-header-cell { background: #f8fafc; color: #475569; font-weight: 700; height: 48px; font-size: 11px; text-transform: uppercase; }
    .mat-mdc-cell { height: 60px; border-bottom: 1px solid #f1f5f9; }

    .emp-cell { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 32px; height: 32px; background: #3b82f6; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
    .meta { display: flex; flex-direction: column; }
    .meta .name { font-size: 13px; font-weight: 700; color: #1e293b; }
    .meta .user { font-size: 11px; color: #64748b; }

    .val-cell { font-size: 14px; font-weight: 600; color: #334155; }
    .highlight { color: #2563eb; }

    .empty-state { padding: 60px; text-align: center; color: #94a3b8; mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ConsolidadoComponent {
  turnos = input<Turno[]>([]);
  empleados = input<Empleado[]>([]);

  displayedColumns: string[] = ['nombre', 'horas', 'domingos', 'festivos', 'nocturnas', 'descansos'];

  resumen = computed(() => {
    const allTurnos = this.turnos();
    const allEmps = this.empleados();
    
    return allEmps.map(emp => {
      const turnosEmp = allTurnos.filter(t => t.usuario_id === emp.id);
      
      let totalHrs = 0;
      let domTrab = 0;
      let festTrab = 0;
      let noctHrs = 0;
      let desCount = 0;

      turnosEmp.forEach(t => {
        const start = DateTime.fromISO(t.hora_inicio, { zone: 'utc' });
        const end = DateTime.fromISO(t.hora_fin, { zone: 'utc' });
        const diff = end.diff(start, 'hours').hours;

        if (t.tipo === 'turno') {
          totalHrs += diff;
          
          // Dominical?
          if (start.weekday === 7) domTrab++;
          else if (ColombiaHolidays.isHoliday(start)) festTrab++;

          // Nocturnas? (7PM - 6AM)
          noctHrs += this.calculateNightHours(start, end);

        } else if (t.tipo === 'descanso') {
          desCount++;
        }
      });

      return {
        id: emp.id,
        nombre: emp.nombre_completo,
        username: emp.username,
        horasRegistradas: Math.round(totalHrs),
        domingosTrabajados: domTrab,
        festivosTrabajados: festTrab,
        horasNocturnas: noctHrs,
        descansos: desCount,
        incapacidades: 0 // TODO
      };
    });
  });

  totalHours = computed(() => this.resumen().reduce((acc, r) => acc + r.horasRegistradas, 0));
  totalSundays = computed(() => this.resumen().reduce((acc, r) => acc + r.domingosTrabajados, 0));
  totalNightHours = computed(() => this.resumen().reduce((acc, r) => acc + r.horasNocturnas, 0));

  private calculateNightHours(start: DateTime, end: DateTime): number {
    // Definimos el rango nocturno: de 19:00 (7 PM) a 06:00 (6 AM)
    // El turno puede durar varias horas o incluso cruzar la medianoche
    let totalNightMs = 0;
    
    // Analizamos cada "día" que toca el turno
    let currentDay = start.startOf('day');
    const endDay = end.endOf('day');

    while (currentDay <= endDay) {
       // Rango nocturno de ESTE día: 19:00 hasta 06:00 del día sgte
       // Segmento A: de 00:00 a 06:00 (madrugada de este día, que viene de la noche anterior)
       const segmentAStart = currentDay.set({ hour: 0, minute: 0, second: 0 });
       const segmentAEnd = currentDay.set({ hour: 6, minute: 0, second: 0 });
       
       // Segmento B: de 19:00 a 24:00 (noche de este día)
       const segmentBStart = currentDay.set({ hour: 19, minute: 0, second: 0 });
       const segmentBEnd = currentDay.set({ hour: 23, minute: 59, second: 59, millisecond: 999 });

       // Intersección con el turno real [start, end]
       totalNightMs += this.intersectionLength(start, end, segmentAStart, segmentAEnd);
       totalNightMs += this.intersectionLength(start, end, segmentBStart, segmentBEnd);

       currentDay = currentDay.plus({ days: 1 });
    }

    return totalNightMs / (1000 * 60 * 60);
  }

  private intersectionLength(s1: DateTime, e1: DateTime, s2: DateTime, e2: DateTime): number {
     const start = Math.max(s1.toMillis(), s2.toMillis());
     const end = Math.min(e1.toMillis(), e2.toMillis());
     return Math.max(0, end - start);
  }
}
