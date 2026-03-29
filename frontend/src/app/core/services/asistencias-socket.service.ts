import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '@env/environment';
import { Observable, Subject } from 'rxjs';
import { EstadoActualizadoEvento } from '@core/models/estado.model';

@Injectable({ providedIn: 'root' })
export class AsistenciasSocketService {
  private socket?: Socket;
  private estadoActualizadoSubject = new Subject<EstadoActualizadoEvento>();

  constructor(private readonly ngZone: NgZone) {}

  connect(): void {
    if (this.socket?.connected) return;

    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    this.socket = io(baseUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('asistencias:estado_actualizado', (event: EstadoActualizadoEvento) => {
      this.ngZone.run(() => {
        this.estadoActualizadoSubject.next(event);
      });
    });
  }

  onEstadoActualizado(): Observable<EstadoActualizadoEvento> {
    return this.estadoActualizadoSubject.asObservable();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }
}
