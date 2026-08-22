import { Injectable } from '@angular/core';
import { Observable, EMPTY } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AlertEvent } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;

  constructor() {
    try {
      const hostname = window.location.hostname;
      // Solo conectar a socket.io si estamos en localhost o si el puerto 3001 está disponible
      if (!hostname.includes('proxy.runpod.net')) {
        this.socket = io('http://localhost:3001', {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 2,
          timeout: 2000
        });
      }
    } catch {
      this.socket = null;
    }
  }

  listenToAlerts(): Observable<AlertEvent> {
    if (!this.socket) {
      return EMPTY;
    }

    return new Observable(observer => {
      this.socket?.on('k2:alert', (data: AlertEvent) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('k2:alert');
      };
    });
  }
}
