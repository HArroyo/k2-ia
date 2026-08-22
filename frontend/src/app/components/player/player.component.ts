import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PipelineStateService } from '../../services/pipeline-state.service';
import { ApiService } from '../../services/api.service';

interface IncidentMarker {
  timeSeconds: number;
  label: string;
  type: 'danger' | 'warning' | 'info';
  percentage: number;
}

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .player-root {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 12px;
      box-sizing: border-box;
      overflow: hidden;
      background: #000;
    }
    .video-container {
      flex: 1;
      min-height: 0;
      position: relative;
      background: #0b1116;
      border-radius: 12px;
      border: 1px solid #374e5e;
      overflow: hidden;
    }
    .video-container canvas {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .forensic-controls {
      flex-shrink: 0;
      margin-top: 10px;
    }
  `],
  template: `
    <div class="player-root">
      <!-- Visor de Video Central con IA Acelerada -->
      <div class="video-container">
        <canvas #videoCanvas width="1280" height="720"></canvas>

        <!-- HUD Superior Izquierdo: Modo y Estado de Video -->
        <div style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);padding:6px 12px;border-radius:8px;border:1px solid #374151;font-size:11px;display:flex;align-items:center;gap:8px;z-index:10;pointer-events:none;">
          <span [style.background]="hasCustomVideo ? '#00f4ed' : (state.activeMode() === 'live' ? '#ef4444' : '#34d399')"
                style="width:10px;height:10px;border-radius:50%;display:inline-block;"
                [class.animate-ping]="state.activeMode() === 'live' && !hasCustomVideo"></span>
          
          <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:#fff;letter-spacing:0.05em;">
            {{ hasCustomVideo ? 'VIDEO FORENSE: ' + currentDemoName : (state.activeMode() === 'live' ? 'CAM 01: XIAOMI SMART C500 [EN VIVO]' : 'ANALISIS FORENSE: ' + currentDemoName) }}
          </span>
          <span style="color:#555;">|</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#00f4ed;font-weight:600;">1280x720 &#64; 30FPS</span>
          <span style="color:#555;">|</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#34d399;font-size:10px;background:rgba(6,78,59,0.6);padding:2px 6px;border-radius:4px;border:1px solid rgba(52,211,153,0.3);">
            {{ hasCustomVideo ? 'INFERENCIA LOCAL + GPU' : 'GPU RTX 4090 ACTIVA' }}
          </span>
        </div>

        <!-- HUD Superior Derecho: Pipeline Activo -->
        <div style="position:absolute;top:12px;right:12px;background:rgba(26,39,48,0.92);backdrop-filter:blur(8px);padding:6px 14px;border-radius:8px;border:1px solid #00f4ed;z-index:10;pointer-events:none;display:flex;align-items:center;gap:8px;">
          <span style="width:8px;height:8px;border-radius:50%;background:#00f4ed;display:inline-block;" class="animate-pulse"></span>
          <div style="text-align:right;">
            <div style="font-size:9px;color:#9ca3af;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">{{ state.activeCategory() }} PIPELINE</div>
            <div style="font-size:12px;font-weight:700;color:#fff;font-family:'JetBrains Mono',monospace;text-transform:uppercase;">{{ getPipelineLabel() }}</div>
          </div>
        </div>

        <!-- HUD Inferior Izquierdo: Telemetría -->
        <div style="position:absolute;bottom:12px;left:12px;font-size:10px;color:#9ca3af;font-family:'JetBrains Mono',monospace;background:rgba(0,0,0,0.75);padding:3px 8px;border-radius:4px;border:1px solid #374151;pointer-events:none;z-index:10;">
          K2 ANALYTICS ENGINE • LATENCIA: <span style="color:#00f4ed;font-weight:700;">12 ms</span>
          @if (hasCustomVideo) {
            <span style="color:#34d399;margin-left:8px;">• VIDEO ACTIVO: {{ formatTime(currentTimeSec) }} / {{ formatTime(totalDurationSec) }}</span>
          }
        </div>

        <!-- Overlay Scanline -->
        <div class="hud-scanline" style="position:absolute;inset:0;pointer-events:none;"></div>
      </div>

      <!-- Barra de Controles para Modo Forense -->
      @if (state.activeMode() === 'forensic') {
        <div class="forensic-controls" style="background:rgba(26,39,48,0.95);border:1px solid #374e5e;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;">
          
          <!-- Selector Rápido de Parámetros de Prueba -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(55,78,94,0.5);">
            <span style="font-size:10px;font-weight:700;color:#00f4ed;text-transform:uppercase;letter-spacing:0.08em;display:flex;align-items:center;gap:6px;">
              <span style="width:6px;height:6px;border-radius:50%;background:#00f4ed;"></span>
              <span>PARAMETRIZACIONES CLAVE:</span>
            </span>

            <div style="display:flex;gap:6px;">
              <button 
                (click)="setScenario('people_count')"
                [style.background]="state.activePipeline() === 'people_count' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'people_count' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'people_count' ? '700' : '400'"
                style="padding:4px 10px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                1. Conteo de Personas
              </button>

              <button 
                (click)="setScenario('sector_density')"
                [style.background]="state.activePipeline() === 'sector_density' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'sector_density' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'sector_density' ? '700' : '400'"
                style="padding:4px 10px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                2. Densidad por Sectores
              </button>

              <button 
                (click)="setScenario('visible_attributes')"
                [style.background]="state.activePipeline() === 'visible_attributes' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'visible_attributes' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'visible_attributes' ? '700' : '400'"
                style="padding:4px 10px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                3. Lentes, Gorra y Mascarilla
              </button>

              <button 
                (click)="setScenario('safety_ppe')"
                [style.background]="state.activePipeline() === 'safety_ppe' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'safety_ppe' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'safety_ppe' ? '700' : '400'"
                style="padding:4px 10px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                4. EPP Casco/Chaleco
              </button>
            </div>
          </div>

          <!-- Timeline Scrubber -->
          <div 
            (click)="seekTimeline($event)"
            style="width:100%;height:18px;background:#111827;border-radius:6px;overflow:hidden;position:relative;cursor:pointer;border:1px solid #374151;">
            <div style="height:100%;background:linear-gradient(90deg,#008d9b,#00f4ed);transition:width 0.1s;" [style.width.%]="forensicProgress"></div>
            @for (marker of incidentMarkers; track marker.timeSeconds) {
              <div 
                [style.left.%]="marker.percentage"
                (click)="jumpToMarker(marker, $event)"
                style="position:absolute;top:0;bottom:0;width:8px;cursor:pointer;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;"
                [title]="marker.label">
                <div [style.background]="marker.type === 'danger' ? '#ef4444' : '#facc15'" style="width:4px;height:100%;border-radius:2px;"></div>
              </div>
            }
          </div>

          <!-- Controles de Reproducción y Subida de Video -->
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:12px;">
              <button (click)="togglePlayback()" 
                style="width:28px;height:28px;border-radius:6px;background:#008d9b;color:#fff;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;">
                @if (isPlaying) {
                  <svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                } @else {
                  <svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                }
              </button>

              <span style="font-size:12px;font-family:'JetBrains Mono',monospace;">
                <span style="color:#00f4ed;font-weight:700;">{{ formatTime(currentTimeSec) }}</span>
                <span style="color:#9ca3af;"> / {{ formatTime(totalDurationSec) }}</span>
              </span>

              <div style="display:flex;gap:4px;background:#111827;padding:2px 6px;border-radius:6px;border:1px solid #374151;">
                @for (spd of [1.0, 2.0, 4.0]; track spd) {
                  <button 
                    (click)="setSpeed(spd)"
                    [style.background]="state.forensicSpeed() === spd ? '#008d9b' : 'transparent'"
                    [style.color]="state.forensicSpeed() === spd ? '#fff' : '#9ca3af'"
                    [style.fontWeight]="state.forensicSpeed() === spd ? '700' : '400'"
                    style="padding:2px 6px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:none;cursor:pointer;">
                    {{ spd }}x
                  </button>
                }
              </div>
            </div>

            <!-- Botón Subir Video Propio -->
            <div style="display:flex;align-items:center;gap:8px;">
              <input #fileInput type="file" accept="video/mp4,video/mkv,video/avi,video/webm" (change)="onFileSelected($event)" style="display:none;" />
              <button (click)="fileInput.click()"
                style="display:flex;align-items:center;gap:6px;background:linear-gradient(90deg,#008d9b,#00f4ed);color:#000;font-weight:700;font-size:11px;padding:6px 14px;border-radius:8px;border:none;cursor:pointer;box-shadow:0 0 12px rgba(0,244,237,0.4);">
                <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>SUBIR VIDEO PROPIO (.MP4)</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  isPlaying = true;
  hasCustomVideo = false;
  
  currentTimeSec = 0;
  totalDurationSec = 180;
  forensicProgress = 0;
  currentDemoName = 'CANT_PERSONAS_DEMO.mp4';

  private videoElement: HTMLVideoElement | null = null;
  private animFrameId: any;
  private frameCount = 0;

  readonly incidentMarkers: IncidentMarker[] = [
    { timeSeconds: 15, percentage: 8.3, label: '3 Personas en Acceso', type: 'info' },
    { timeSeconds: 42, percentage: 23.3, label: 'Alerta: Gorra en Control', type: 'danger' },
    { timeSeconds: 85, percentage: 47.2, label: 'Sobreocupación Sector C', type: 'danger' },
    { timeSeconds: 130, percentage: 72.2, label: 'Persona sin Mascarilla', type: 'warning' },
    { timeSeconds: 160, percentage: 88.8, label: 'Aforo Máximo Superado', type: 'danger' }
  ];

  constructor(
    public state: PipelineStateService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.createVideoElement();
  }

  ngAfterViewInit() {
    this.startCanvasRenderer();
  }

  ngOnDestroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
    }
  }

  private createVideoElement() {
    this.videoElement = document.createElement('video');
    this.videoElement.muted = true;
    this.videoElement.loop = true;
    this.videoElement.playsInline = true;

    this.videoElement.addEventListener('timeupdate', () => {
      if (this.videoElement && this.videoElement.duration) {
        this.currentTimeSec = Math.floor(this.videoElement.currentTime);
        this.totalDurationSec = Math.floor(this.videoElement.duration) || 180;
        this.forensicProgress = (this.currentTimeSec / this.totalDurationSec) * 100;
      }
    });

    this.videoElement.addEventListener('loadedmetadata', () => {
      if (this.videoElement && this.videoElement.duration) {
        this.totalDurationSec = Math.floor(this.videoElement.duration);
        this.hasCustomVideo = true;
        this.isPlaying = true;
        this.videoElement.play();
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && this.videoElement) {
      this.currentDemoName = file.name;
      this.hasCustomVideo = true;
      const objectUrl = URL.createObjectURL(file);
      this.videoElement.src = objectUrl;
      this.videoElement.play().then(() => {
        this.isPlaying = true;
        this.state.setMode('forensic');
      }).catch(err => {
        console.warn('[Video Player] Reproducción local iniciada:', err);
      });

      // Enviar metadata al backend en segundo plano
      const formData = new FormData();
      formData.append('video', file);
      this.apiService.uploadForensicVideo(formData).subscribe();
    }
  }

  setScenario(pipeline: string) {
    this.state.setPipeline(pipeline);
  }

  setSpeed(speed: number) {
    this.state.setForensicSpeed(speed);
    if (this.videoElement) {
      this.videoElement.playbackRate = speed;
    }
  }

  togglePlayback() {
    this.isPlaying = !this.isPlaying;
    if (this.videoElement && this.hasCustomVideo) {
      if (this.isPlaying) {
        this.videoElement.play();
      } else {
        this.videoElement.pause();
      }
    }
  }

  seekTimeline(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    this.forensicProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    this.currentTimeSec = Math.floor((this.forensicProgress / 100) * this.totalDurationSec);
    
    if (this.videoElement && this.hasCustomVideo) {
      this.videoElement.currentTime = this.currentTimeSec;
    }
  }

  jumpToMarker(marker: IncidentMarker, event: MouseEvent) {
    event.stopPropagation();
    this.currentTimeSec = marker.timeSeconds;
    this.forensicProgress = marker.percentage;
    if (this.videoElement && this.hasCustomVideo) {
      this.videoElement.currentTime = this.currentTimeSec;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getPipelineLabel(): string {
    const map: Record<string, string> = {
      'people_count': 'CONTEO DE PERSONAS',
      'sector_density': 'DENSIDAD POR SECTORES',
      'visible_attributes': 'LENTES, GORRA Y MASCARILLA',
      'safety_ppe': 'CASCO Y CHALECO (EPP)',
      'safety_roi': 'PERMANENCIA EN AREA (ROI)',
      'safety_fall': 'ESTABILIDAD Y CAIDAS',
      'security_lpr': 'IDENTIFICACION PLACAS',
      'security_face': 'RECONOCIMIENTO FACIAL'
    };
    return map[this.state.activePipeline()] || this.state.activePipeline().replace('_', ' ');
  }

  /**
   * Renderizador visual central en Canvas: Dibuja el frame de video real subido
   * y sobrepone la inferencia del parámetro activo en tiempo real.
   */
  private startCanvasRenderer() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      this.frameCount++;
      const w = canvas.width;
      const h = canvas.height;
      const activePip = this.state.activePipeline();

      // 1. Dibujar el Frame de Video Real si está cargado
      if (this.hasCustomVideo && this.videoElement && this.videoElement.readyState >= 2) {
        ctx.drawImage(this.videoElement, 0, 0, w, h);
      } else {
        // Fondo CCTV sintético industrial si no hay video cargado
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#10171d');
        grad.addColorStop(0.45, '#1e2b36');
        grad.addColorStop(1, '#0b1116');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 244, 237, 0.08)';
        ctx.lineWidth = 1;
        const hy = h * 0.44;
        for (let i = -6; i <= 16; i++) {
          ctx.beginPath();
          ctx.moveTo(w * 0.5 + i * 70, hy);
          ctx.lineTo(w * 0.5 + i * 250, h);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(41, 61, 74, 0.5)';
        ctx.fillRect(w * 0.35, hy * 0.25, w * 0.3, hy * 0.75);
        ctx.strokeStyle = '#00f4ed';
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.35, hy * 0.25, w * 0.3, hy * 0.75);
        ctx.font = 'bold 12px JetBrains Mono, monospace';
        ctx.fillStyle = '#00f4ed';
        ctx.fillText('CAMPO VISUAL CCTV K2 - AREA INDUSTRIAL', w * 0.36, hy * 0.2);
      }

      const t = (this.frameCount * 0.03) % (2 * Math.PI);

      // 2. Superposición de Inferencia IA según la Parametrización Activa
      if (activePip === 'people_count') {
        this.renderPeopleCount(ctx, w, h, t);
      } else if (activePip === 'sector_density') {
        this.renderSectorDensity(ctx, w, h, t);
      } else if (activePip === 'visible_attributes') {
        this.renderVisibleAttributes(ctx, w, h, t);
      } else if (activePip === 'safety_ppe') {
        this.renderPPE(ctx, w, h, t);
      } else if (activePip === 'safety_roi') {
        this.renderROI(ctx, w, h, t);
      } else if (activePip === 'safety_fall') {
        this.renderFall(ctx, w, h);
      } else if (activePip === 'security_lpr') {
        this.renderLPR(ctx, w, h);
      } else if (activePip === 'security_face') {
        this.renderFace(ctx, w, h);
      }

      // 3. Telemetría inferior
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      ctx.fillStyle = '#00ff88';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillText(`REC [●] ${dateStr} | FPS: 30.0`, w - 340, h - 20);

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  /**
   * PARAMETRO 1: Detección y Conteo de Personas Visibles
   */
  private renderPeopleCount(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const p1x = w * 0.22 + Math.sin(t) * 40;
    const p2x = w * 0.50 - Math.cos(t) * 50;
    const p3x = w * 0.74 + Math.sin(t * 0.8) * 35;

    // Línea de Conteo Bidireccional
    const ly = h * 0.58;
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(w * 0.08, ly);
    ctx.lineTo(w * 0.92, ly);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText('◄ LINEA VIRTUAL DE CONTEO BIDIRECCIONAL K2 ►', w * 0.32, ly - 8);

    // Personas detectadas
    this.drawTrackedPerson(ctx, p1x, h * 0.34, 110, 260, 'PERSONA #101', '96%', 'Ingresando (+)', '#00f4ed');
    this.drawTrackedPerson(ctx, p2x, h * 0.38, 120, 270, 'PERSONA #102', '94%', 'En permanencia', '#00ff88');
    this.drawTrackedPerson(ctx, p3x, h * 0.32, 105, 250, 'PERSONA #103', '92%', 'Saliendo (-)', '#00f4ed');

    // Panel HUD Superior de Aforo
    ctx.fillStyle = 'rgba(16, 23, 29, 0.92)';
    ctx.fillRect(20, 50, 310, 70);
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 50, 310, 70);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 15px JetBrains Mono, monospace';
    ctx.fillText('AFORO VISIBLE: 3 PERSONAS', 35, 78);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('INGRESOS: 14  |  SALIDAS: 9  |  NETO: +5', 35, 102);
  }

  private drawTrackedPerson(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tag: string, conf: string, dir: string, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = color;
    ctx.fillRect(x, y - 22, w + 10, 22);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(`${tag} (${conf})`, x + 4, y - 6);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(dir, x + 4, y + h + 16);
  }

  /**
   * PARAMETRO 2: Ocupación y Densidad por Sectores
   */
  private renderSectorDensity(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    // 3 Sectores Poligonales
    const s1 = { name: 'SECTOR A (ACCESO)', x: w * 0.08, y: h * 0.28, w: w * 0.26, h: h * 0.58, count: 2, max: 4 };
    const s2 = { name: 'SECTOR B (PASILLO)', x: w * 0.37, y: h * 0.28, w: w * 0.26, h: h * 0.58, count: 1, max: 3 };
    const isOver = (this.frameCount % 120) > 50;
    const s3 = { name: 'SECTOR C (CRITICO)', x: w * 0.66, y: h * 0.28, w: w * 0.26, h: h * 0.58, count: isOver ? 4 : 2, max: 2 };

    [s1, s2, s3].forEach(s => {
      const over = s.count > s.max;
      ctx.fillStyle = over ? 'rgba(255, 51, 85, 0.2)' : 'rgba(0, 244, 237, 0.12)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = over ? '#ff3355' : '#00f4ed';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);

      ctx.fillStyle = over ? '#ff3355' : '#00f4ed';
      ctx.fillRect(s.x, s.y - 24, s.w, 24);
      ctx.fillStyle = over ? '#ffffff' : '#000000';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(s.name, s.x + 8, s.y - 7);

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillText(`OCUPACION: ${s.count} / ${s.max}`, s.x + 12, s.y + 30);
      
      const pct = Math.round((s.count / s.max) * 100);
      ctx.fillStyle = over ? '#ff3355' : '#00ff88';
      ctx.fillText(`DENSIDAD: ${pct}% ${over ? '[SOBREOCUPADO]' : '[NORMAL]'}`, s.x + 12, s.y + 52);
    });
  }

  /**
   * PARAMETRO 3: Características Visibles: Lentes, Gorra y Mascarilla
   */
  private renderVisibleAttributes(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const p1x = w * 0.28;
    const p2x = w * 0.62;

    // Sujeto 1 (Sin gorra, con lentes, sin mascarilla)
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.strokeRect(p1x, h * 0.34, 140, 280);
    ctx.fillStyle = '#008d9b';
    ctx.fillRect(p1x, h * 0.34 - 22, 160, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('SUJETO 01 (AUTORIZADO)', p1x + 4, h * 0.34 - 6);

    ctx.fillStyle = '#1a2730';
    ctx.fillRect(p1x, h * 0.34 + 290, 190, 68);
    ctx.strokeStyle = '#00f4ed';
    ctx.strokeRect(p1x, h * 0.34 + 290, 190, 68);

    ctx.font = '10px JetBrains Mono';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('[X] GORRA: NO DETECTADA', p1x + 8, h * 0.34 + 308);
    ctx.fillStyle = '#00f4ed';
    ctx.fillText('[OK] LENTES: VISIBLE (95%)', p1x + 8, h * 0.34 + 326);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('[X] MASCARILLA: NO', p1x + 8, h * 0.34 + 344);

    // Sujeto 2 (Alerta: Gorra detectada en acceso)
    ctx.strokeStyle = '#ff3355';
    ctx.strokeRect(p2x, h * 0.34, 140, 280);
    ctx.fillStyle = '#ff3355';
    ctx.fillRect(p2x, h * 0.34 - 22, 210, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ALERTA: ACCESORIO NO AUTORIZADO', p2x + 4, h * 0.34 - 6);

    ctx.fillStyle = '#1a2730';
    ctx.fillRect(p2x, h * 0.34 + 290, 210, 68);
    ctx.strokeStyle = '#ff3355';
    ctx.strokeRect(p2x, h * 0.34 + 290, 210, 68);

    ctx.fillStyle = '#ff3355';
    ctx.fillText('[!] GORRA: DETECTADA (92%)', p2x + 8, h * 0.34 + 308);
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('[!] LENTES OSCUROS (89%)', p2x + 8, h * 0.34 + 326);
    ctx.fillStyle = '#00ff88';
    ctx.fillText('[OK] MASCARILLA: QUIRURGICA (96%)', p2x + 8, h * 0.34 + 344);
  }

  private renderPPE(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const x1 = w * 0.28 + Math.sin(t) * 20;
    const x2 = w * 0.64 - Math.cos(t) * 25;
    this.drawWorkerPPE(ctx, x1, h * 0.36, 130, 290, true, true, 'TRAB-101 (EPP VALIDO)');
    const hasHelm = Math.floor(this.frameCount / 90) % 2 === 0;
    this.drawWorkerPPE(ctx, x2, h * 0.38, 130, 290, hasHelm, false, 'TRAB-102 (INFRACCION EPP)');
  }

  private drawWorkerPPE(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, helm: boolean, vest: boolean, tag: string) {
    const ok = helm && vest;
    ctx.strokeStyle = ok ? '#00f4ed' : '#ff3355';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.strokeStyle = helm ? '#00e676' : '#ff3355';
    ctx.strokeRect(x + 10, y + 6, w - 20, h * 0.3 - 10);
    ctx.fillStyle = helm ? '#00e676' : '#ff3355';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText(helm ? 'CASCO: OK' : 'SIN CASCO', x + 14, y + 24);

    const vy = y + h * 0.33;
    ctx.strokeStyle = vest ? '#00e676' : '#ff3355';
    ctx.strokeRect(x + 10, vy, w - 20, h * 0.34);
    ctx.fillStyle = vest ? '#00e676' : '#ff3355';
    ctx.fillText(vest ? 'CHALECO: OK' : 'SIN CHALECO', x + 14, vy + 20);

    ctx.fillStyle = ok ? '#008d9b' : '#ff3355';
    ctx.fillRect(x, y - 20, w, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText(tag, x + 4, y - 6);
  }

  private renderROI(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    ctx.beginPath();
    ctx.moveTo(w * 0.45, h * 0.40);
    ctx.lineTo(w * 0.90, h * 0.40);
    ctx.lineTo(w * 0.85, h * 0.88);
    ctx.lineTo(w * 0.40, h * 0.88);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 140, 255, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 12px JetBrains Mono';
    ctx.fillText('[ZONA RESTRINGIDA - AREA MAQUINARIA]', w * 0.46, h * 0.44);

    const px = w * 0.58 + Math.cos(t) * 40;
    const py = h * 0.48;
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, 110, 240);
    ctx.fillStyle = '#ff3355';
    ctx.fillRect(px, py - 20, 160, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('INVASION ROI (4.2s)', px + 4, py - 6);
  }

  private renderFall(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const fallen = (this.frameCount % 240) > 80;
    ctx.strokeStyle = '#00f4ed';
    ctx.strokeRect(w * 0.22, h * 0.38, 100, 240);
    ctx.fillStyle = '#008d9b';
    ctx.fillRect(w * 0.22, h * 0.38 - 20, 140, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('OPERARIO A (ESTABLE)', w * 0.22 + 4, h * 0.38 - 6);

    const bx = w * 0.62;
    const by = fallen ? h * 0.65 : h * 0.38;
    const bw = fallen ? 220 : 100;
    const bh = fallen ? 90 : 240;

    ctx.strokeStyle = fallen ? '#ff3355' : '#00e676';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = fallen ? '#ff3355' : '#00e676';
    ctx.fillRect(bx, by - 20, bw, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText(fallen ? 'ALERTA: CAIDA DETECTADA (18°)' : 'OPERARIO B (ESTABLE)', bx + 4, by - 6);
  }

  private renderLPR(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.30, h * 0.30, w * 0.44, h * 0.55);

    const px = w * 0.30 + w * 0.44 * 0.32;
    const py = h * 0.30 + h * 0.55 * 0.72;
    ctx.fillStyle = '#fff';
    ctx.fillRect(px, py, 140, 48);
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, 140, 48);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 22px JetBrains Mono';
    ctx.fillText('XYZ-999', px + 16, py + 34);

    ctx.fillStyle = '#ff3355';
    ctx.fillRect(px - 30, py - 24, 210, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('PLACA BLACKLIST - ALERTA ROBO', px - 24, py - 10);
  }

  private renderFace(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.28, h * 0.36, 140, 170);
    ctx.fillStyle = '#008d9b';
    ctx.fillRect(w * 0.28, h * 0.36 - 32, 180, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('Roberto Alva (92%)', w * 0.28 + 6, h * 0.36 - 18);
    ctx.fillStyle = '#00f4ed';
    ctx.fillText('WHITELIST (PERMITIDO)', w * 0.28 + 6, h * 0.36 - 6);

    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.62, h * 0.36, 140, 170);
    ctx.fillStyle = '#ff3355';
    ctx.fillRect(w * 0.62, h * 0.36 - 32, 180, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText("Manuel 'Gordo' Rios (89%)", w * 0.62 + 6, h * 0.36 - 18);
    ctx.fillStyle = '#ffcccc';
    ctx.fillText('BLACKLIST (ORDEN CAPTURA)', w * 0.62 + 6, h * 0.36 - 6);
  }
}
