import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AlertEvent {
  id?: number;
  modulo: string;
  subtipo: string;
  snapshot_path?: string;
  confianza: number;
  coordenadas?: any;
  metadata?: any;
  created_at?: string;
}

export interface ShiftMetrics {
  total_detecciones: number;
  infracciones_epp: number;
  alertas_blacklist: number;
  caidas_registradas: number;
  invasiones_zona: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl: string;
  private aiUrl: string;

  constructor(private http: HttpClient) {
    const hostname = window.location.hostname;
    if (hostname.includes('proxy.runpod.net')) {
      // Extraer el ID del pod de la URL (ej: qk9p20yrvoj9m3-4200 -> qk9p20yrvoj9m3)
      const podId = hostname.split('-')[0];
      this.apiUrl = `https://${podId}-8000.proxy.runpod.net/api`;
      this.aiUrl = `https://${podId}-8001.proxy.runpod.net/api`;
    } else {
      this.apiUrl = 'http://localhost:8000/api';
      this.aiUrl = 'http://localhost:8001/api';
    }
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  getAiUrl(): string {
    return this.aiUrl;
  }

  getMetrics(): Observable<{ status: string; data: ShiftMetrics }> {
    return this.http.get<{ status: string; data: ShiftMetrics }>(`${this.apiUrl}/metricas`);
  }

  getEvents(modulo?: string, limit: number = 30): Observable<{ status: string; data: AlertEvent[] }> {
    let url = `${this.apiUrl}/eventos?limite=${limit}`;
    if (modulo) {
      url += `&modulo=${modulo}`;
    }
    return this.http.get<{ status: string; data: AlertEvent[] }>(url);
  }

  selectPipeline(pipeline: string): Observable<any> {
    return this.http.post(`${this.aiUrl}/pipeline/select`, { pipeline });
  }

  selectMode(mode: 'live' | 'forensic', speed: number = 1.0): Observable<any> {
    return this.http.post(`${this.aiUrl}/mode/select`, { mode, speed });
  }

  getSystemStatus(): Observable<any> {
    return this.http.get(`${this.aiUrl}/pipeline/status`);
  }

  uploadForensicVideo(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/forensic/upload`, formData);
  }

  getZones(): Observable<any> {
    return this.http.get(`${this.apiUrl}/zonas`);
  }
}
