import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '@env/environment';
import { TurnoSocketEvento } from '@core/models/turno.model';

@Injectable({ providedIn: 'root' })
export class TurnosSocketService {
  private socket?: Socket;

  constructor(private readonly ngZone: NgZone) {}

  connect(): void {
    if (this.socket) {
      return;
    }

    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    this.socket = io(baseUrl, {
      transports: ['websocket'],
      autoConnect: true
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  onTurnosActualizado(callback: (evento: TurnoSocketEvento) => void): () => void {
    const handler = (payload: TurnoSocketEvento) => {
      this.ngZone.run(() => callback(payload));
    };

    this.socket?.on('turnos:actualizado', handler);
    return () => this.socket?.off('turnos:actualizado', handler);
  }

  onSolicitudesNovedad(callback: (payload: any) => void): () => void {
    const handler = (payload: any) => {
      this.ngZone.run(() => callback(payload));
    };

    this.socket?.on('solicitudes:novedad', handler);
    return () => this.socket?.off('solicitudes:novedad', handler);
  }
}
