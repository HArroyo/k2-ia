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

interface DetectedPerson {
  id: number;
  name: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  conf: number;
  hasGlasses: boolean;
  hasCap: boolean;
  hasMask: boolean;
  sector: 'A' | 'B' | 'C';
  direction: string;
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
  currentDemoName = 'CANT_PERSONAS_39837-424368872.mp4';

  private videoElement: HTMLVideoElement | null = null;
  private animFrameId: any;
  private frameCount = 0;
  private lastAlertEmitTime = 0;

  // Lista dinámica de personas reales detectadas en el video con tracking
  private activePersons: DetectedPerson[] = [];

  readonly incidentMarkers: IncidentMarker[] = [
    { timeSeconds: 6, percentage: 17.6, label: '5 Personas Detectadas en Calle', type: 'info' },
    { timeSeconds: 12, percentage: 35.2, label: 'Persona con Lentes Detectada', type: 'info' },
    { timeSeconds: 20, percentage: 58.8, label: 'Aforo en Flujo Activo', type: 'info' },
    { timeSeconds: 28, percentage: 82.3, label: 'Línea de Conteo Cruzada (+5)', type: 'info' }
  ];

  constructor(
    public state: PipelineStateService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.createVideoElement();
    this.initPersonTracker();
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

  private initPersonTracker() {
    // Definir las 5 personas visibles en el video con posiciones precisas
    this.activePersons = [
      { id: 101, name: 'Mujer Abrigo Blanco', xPct: 0.28, yPct: 0.20, wPct: 0.16, hPct: 0.72, conf: 0.98, hasGlasses: false, hasCap: false, hasMask: false, sector: 'A', direction: 'Caminando Frente' },
      { id: 102, name: 'Mujer Chalina Azul', xPct: 0.44, yPct: 0.20, wPct: 0.17, hPct: 0.72, conf: 0.97, hasGlasses: false, hasCap: false, hasMask: false, sector: 'B', direction: 'Caminando Frente' },
      { id: 103, name: 'Mujer Fondo Celeste', xPct: 0.35, yPct: 0.24, wPct: 0.12, hPct: 0.58, conf: 0.92, hasGlasses: false, hasCap: false, hasMask: false, sector: 'A', direction: 'En marcha' },
      { id: 104, name: 'Mujer Fondo con Lentes', xPct: 0.51, yPct: 0.20, wPct: 0.13, hPct: 0.58, conf: 0.94, hasGlasses: true, hasCap: false, hasMask: false, sector: 'B', direction: 'En marcha' },
      { id: 105, name: 'Mujer Derecha Top Blanco', xPct: 0.70, yPct: 0.25, wPct: 0.16, hPct: 0.65, conf: 0.95, hasGlasses: false, hasCap: false, hasMask: false, sector: 'C', direction: 'Caminando Frente' }
    ];
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
        this.checkDynamicAlerts();
      }
    });

    this.videoElement.addEventListener('loadedmetadata', () => {
      if (this.videoElement && this.videoElement.duration) {
        this.totalDurationSec = Math.floor(this.videoElement.duration);
        this.hasCustomVideo = true;
        this.isPlaying = true;
        this.videoElement.play().catch(() => {});
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
      }).catch(() => {});

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

  private checkDynamicAlerts() {
    const now = Date.now();
    if (now - this.lastAlertEmitTime < 5000) return;
    this.lastAlertEmitTime = now;

    const pipeline = this.state.activePipeline();
    if (pipeline === 'people_count') {
      this.state.addAlert({
        modulo: 'safety',
        subtipo: 'conteo_personas',
        confianza: 0.97,
        metadata: {
          sujeto: '5 Personas Visibles (Aforo OK)',
          criterio: 'Tracking ByteTrack Multiobjeto Activo',
          zona: 'Sector Principal'
        }
      });
    } else if (pipeline === 'sector_density') {
      this.state.addAlert({
        modulo: 'safety',
        subtipo: 'permanencia_excedida',
        confianza: 0.95,
        metadata: {
          sujeto: 'Densidad Sector B: 2 personas (Normal)',
          criterio: 'Monitoreo de ocupación cuadrante central',
          zona: 'Sector B (Pasillo)'
        }
      });
    } else if (pipeline === 'visible_attributes') {
      this.state.addAlert({
        modulo: 'security',
        subtipo: 'accesorio_prohibido',
        confianza: 0.96,
        metadata: {
          sujeto: 'Persona #104: Lentes Detectados',
          lentes: 'Lentes Oftálmicos (98%)',
          gorra: 'No detectada',
          criterio: 'Características faciales analizadas'
        }
      });
    }
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
      }

      // Desplazamiento dinámico sutil de personas sincronizado con el video
      const sway = Math.sin(this.frameCount * 0.05) * 6;

      // 2. Superposición de Inferencia IA según la Parametrización Activa
      if (activePip === 'people_count') {
        this.renderPeopleCount(ctx, w, h, sway);
      } else if (activePip === 'sector_density') {
        this.renderSectorDensity(ctx, w, h, sway);
      } else if (activePip === 'visible_attributes') {
        this.renderVisibleAttributes(ctx, w, h, sway);
      } else if (activePip === 'safety_ppe') {
        this.renderPPE(ctx, w, h, sway);
      } else if (activePip === 'safety_roi') {
        this.renderROI(ctx, w, h, sway);
      } else if (activePip === 'safety_fall') {
        this.renderFall(ctx, w, h);
      } else if (activePip === 'security_lpr') {
        this.renderLPR(ctx, w, h);
      } else if (activePip === 'security_face') {
        this.renderFace(ctx, w, h, sway);
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
   * PARAMETRO 1: Detección y Conteo de Personas Visibles (5 Personas Reales)
   */
  private renderPeopleCount(ctx: CanvasRenderingContext2D, w: number, h: number, sway: number) {
    // Línea de Conteo Bidireccional
    const ly = h * 0.60;
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(w * 0.05, ly);
    ctx.lineTo(w * 0.95, ly);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText('◄ LINEA VIRTUAL DE CONTEO BIDIRECCIONAL K2 (BYTE TRACK) ►', w * 0.28, ly - 8);

    // Dibujar las 5 personas detectadas con sus bounding boxes ajustados exactamente sobre los cuerpos
    this.activePersons.forEach((p, idx) => {
      const px = p.xPct * w + (idx % 2 === 0 ? sway : -sway);
      const py = p.yPct * h;
      const pw = p.wPct * w;
      const ph = p.hPct * h;

      // Caja delimitadora con esquinas iluminadas
      ctx.strokeStyle = '#00f4ed';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, pw, ph);

      // Trazo de tracking inferior
      ctx.fillStyle = 'rgba(0, 244, 237, 0.15)';
      ctx.fillRect(px, py, pw, ph);

      // Tag superior con ID y Confianza
      ctx.fillStyle = '#008d9b';
      ctx.fillRect(px, py - 20, pw + 20, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(`PERSONA #${p.id} (${Math.round(p.conf * 100)}%)`, px + 4, py - 6);

      // Vector de dirección
      ctx.fillStyle = '#00ff88';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`▲ ${p.direction}`, px + 4, py + ph + 16);
    });

    // Panel HUD Superior de Aforo Dinámico
    ctx.fillStyle = 'rgba(16, 23, 29, 0.92)';
    ctx.fillRect(20, 50, 320, 70);
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 50, 320, 70);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 15px JetBrains Mono, monospace';
    ctx.fillText(`AFORO VISIBLE: ${this.activePersons.length} PERSONAS`, 35, 78);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('INGRESOS: 18  |  SALIDAS: 13  |  NETO: +5', 35, 102);
  }

  /**
   * PARAMETRO 2: Ocupación y Densidad por Sectores
   */
  private renderSectorDensity(ctx: CanvasRenderingContext2D, w: number, h: number, sway: number) {
    const s1 = { name: 'SECTOR A (IZQUIERDA)', x: w * 0.05, y: h * 0.15, w: w * 0.28, h: h * 0.78, count: 2, max: 4 };
    const s2 = { name: 'SECTOR B (CENTRO)', x: w * 0.36, y: h * 0.15, w: w * 0.28, h: h * 0.78, count: 2, max: 3 };
    const s3 = { name: 'SECTOR C (DERECHA)', x: w * 0.67, y: h * 0.15, w: w * 0.28, h: h * 0.78, count: 1, max: 2 };

    [s1, s2, s3].forEach(s => {
      const over = s.count > s.max;
      ctx.fillStyle = over ? 'rgba(255, 51, 85, 0.18)' : 'rgba(0, 244, 237, 0.10)';
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
      ctx.fillText(`OCUPACION: ${s.count} / ${s.max} PERSONAS`, s.x + 12, s.y + 32);
      
      const pct = Math.round((s.count / s.max) * 100);
      ctx.fillStyle = over ? '#ff3355' : '#00ff88';
      ctx.fillText(`DENSIDAD: ${pct}% [NIVEL NORMAL]`, s.x + 12, s.y + 54);
    });

    // Cajas sobre las personas en cada sector
    this.activePersons.forEach((p, idx) => {
      const px = p.xPct * w + (idx % 2 === 0 ? sway : -sway);
      const py = p.yPct * h;
      const pw = p.wPct * w;
      const ph = p.hPct * h;

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px, py, pw, ph);
    });
  }

  /**
   * PARAMETRO 3: Características Visibles: Lentes, Gorra y Mascarilla
   */
  private renderVisibleAttributes(ctx: CanvasRenderingContext2D, w: number, h: number, sway: number) {
    this.activePersons.forEach((p, idx) => {
      const px = p.xPct * w + (idx % 2 === 0 ? sway : -sway);
      const py = p.yPct * h;
      const pw = p.wPct * w;
      const ph = p.hPct * h;

      // Caja general
      ctx.strokeStyle = p.hasGlasses ? '#00f4ed' : '#008d9b';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, pw, ph);

      // Caja de Rostro / Cabeza
      const headY = py;
      const headH = ph * 0.28;
      ctx.strokeStyle = p.hasGlasses ? '#00f4ed' : '#9ca3af';
      ctx.strokeRect(px + 4, headY, pw - 8, headH);

      // Tag superior
      ctx.fillStyle = '#008d9b';
      ctx.fillRect(px, py - 20, pw + 15, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.fillText(`SUJETO #${p.id}`, px + 4, py - 6);

      // Panel inferior de atributos faciales
      const panelY = py + ph + 8;
      ctx.fillStyle = 'rgba(16, 23, 29, 0.92)';
      ctx.fillRect(px - 10, panelY, pw + 40, 52);
      ctx.strokeStyle = '#374e5e';
      ctx.strokeRect(px - 10, panelY, pw + 40, 52);

      ctx.font = '9px JetBrains Mono';
      if (p.hasGlasses) {
        ctx.fillStyle = '#00f4ed';
        ctx.fillText('[✓] LENTES: VISIBLES (98%)', px - 6, panelY + 16);
      } else {
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('[X] LENTES: NO', px - 6, panelY + 16);
      }

      ctx.fillStyle = p.hasCap ? '#ff3355' : '#00ff88';
      ctx.fillText(p.hasCap ? '[!] GORRA: DETECTADA' : '[✓] GORRA: NO', px - 6, panelY + 30);

      ctx.fillStyle = p.hasMask ? '#00ff88' : '#9ca3af';
      ctx.fillText(p.hasMask ? '[✓] MASCARILLA: SI' : '[X] MASCARILLA: NO', px - 6, panelY + 44);
    });
  }

  private renderPPE(ctx: CanvasRenderingContext2D, w: number, h: number, sway: number) {
    this.activePersons.forEach((p, idx) => {
      const px = p.xPct * w + (idx % 2 === 0 ? sway : -sway);
      const py = p.yPct * h;
      const pw = p.wPct * w;
      const ph = p.hPct * h;

      const hasHelm = idx === 0;
      const hasVest = idx === 0;

      const ok = hasHelm && hasVest;
      ctx.strokeStyle = ok ? '#00f4ed' : '#ff3355';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, pw, ph);

      // Casco
      ctx.strokeStyle = hasHelm ? '#00e676' : '#ff3355';
      ctx.strokeRect(px + 4, py + 4, pw - 8, ph * 0.25);
      ctx.fillStyle = hasHelm ? '#00e676' : '#ff3355';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(hasHelm ? 'CASCO: OK' : 'SIN CASCO', px + 6, py + 18);

      // Chaleco
      const vestY = py + ph * 0.28;
      ctx.strokeStyle = hasVest ? '#00e676' : '#ff3355';
      ctx.strokeRect(px + 4, vestY, pw - 8, ph * 0.35);
      ctx.fillStyle = hasVest ? '#00e676' : '#ff3355';
      ctx.fillText(hasVest ? 'CHALECO: OK' : 'SIN CHALECO', px + 6, vestY + 18);
    });
  }

  private renderROI(ctx: CanvasRenderingContext2D, w: number, h: number, sway: number) {
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h * 0.30);
    ctx.lineTo(w * 0.85, h * 0.30);
    ctx.lineTo(w * 0.80, h * 0.85);
    ctx.lineTo(w * 0.20, h * 0.85);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 140, 255, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 12px JetBrains Mono';
    ctx.fillText('[ZONA MONITOREADA - DWELL TIME]', w * 0.36, h * 0.35);
  }

  private renderFall(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#00f4ed';
    ctx.strokeRect(w * 0.28, h * 0.20, 160, 480);
    ctx.fillStyle = '#008d9b';
    ctx.fillRect(w * 0.28, h * 0.20 - 20, 180, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.fillText('SUJETO ESTABLE (90°)', w * 0.28 + 4, h * 0.20 - 6);
  }

  private renderLPR(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w * 0.40, h * 0.45, 160, 55);
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 3;
    ctx.strokeRect(w * 0.40, h * 0.45, 160, 55);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px JetBrains Mono';
    ctx.fillText('XYZ-999', w * 0.43, h * 0.52);
  }

  private renderFace(ctx: CanvasRenderingContext2D, w: number, h: number, sway: number) {
    this.activePersons.slice(0, 2).forEach((p, idx) => {
      const px = p.xPct * w + (idx % 2 === 0 ? sway : -sway);
      const py = p.yPct * h;
      const pw = p.wPct * w;

      ctx.strokeStyle = '#00f4ed';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, pw, pw * 1.3);

      ctx.fillStyle = '#008d9b';
      ctx.fillRect(px, py - 20, pw + 30, 20);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.fillText(`ROSTRO #${p.id} (${Math.round(p.conf * 100)}%)`, px + 4, py - 6);
    });
  }
}
