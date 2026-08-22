import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AlertEvent } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private socketUrl = 'http://localhost:3001';

  constructor() {
    this.socket = io(this.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Conectado a pasarela realtime');
    });

    this.socket.on('disconnect', () => {
      console.log('[SocketService] Desconectado de pasarela realtime');
    });
  }

  listenToAlerts(): Observable<AlertEvent> {
    return new Observable(observer => {
      this.socket.on('k2:alert', (data: AlertEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket.off('k2:alert');
      };
    });
  }
}
