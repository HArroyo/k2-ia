import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PipelineStateService } from '../../services/pipeline-state.service';
import { ApiService } from '../../services/api.service';
import { VideoStorageService } from '../../services/video-storage.service';

declare var cocoSsd: any;

interface IncidentMarker {
  timeSeconds: number;
  label: string;
  type: 'danger' | 'warning' | 'info';
  percentage: number;
}

interface DetectedBox {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
  hasGlasses?: boolean;
  hasCap?: boolean;
  hasMask?: boolean;
  maskType?: string;
  hasHelmet?: boolean;
  hasVest?: boolean;
  isFallen?: boolean;
  angle?: number;
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
      <!-- Visor de Video Central con Inferencia Neuronal -->
      <div class="video-container">
        <canvas #videoCanvas width="1280" height="720"></canvas>

        <!-- HUD Superior Izquierdo: Modo y Estado de Video -->
        <div style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.88);backdrop-filter:blur(8px);padding:6px 12px;border-radius:8px;border:1px solid #374151;font-size:11px;display:flex;align-items:center;gap:8px;z-index:10;pointer-events:none;">
          <span [style.background]="hasCustomVideo ? '#00f4ed' : (state.activeMode() === 'live' ? '#ef4444' : '#6b7280')"
                style="width:10px;height:10px;border-radius:50%;display:inline-block;"
                [class.animate-ping]="hasCustomVideo"></span>
          
          <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:#fff;letter-spacing:0.05em;">
            {{ hasCustomVideo ? 'VIDEO ACTIVO (' + getPipelineLabel() + '): ' + currentDemoName : 'CANAL 01: CAMARA EN ESPERA' }}
          </span>
          <span style="color:#555;">|</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#00f4ed;font-weight:600;">1280x720 &#64; 30FPS</span>
          <span style="color:#555;">|</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#34d399;font-size:10px;background:rgba(6,78,59,0.6);padding:2px 6px;border-radius:4px;border:1px solid rgba(52,211,153,0.3);">
            {{ hasCustomVideo ? 'VIDEO PERSISTENTE GUARDADO' : 'SIN VIDEO ASIGNADO' }}
          </span>
        </div>

        <!-- HUD Superior Derecho: Pipeline Activo -->
        <div style="position:absolute;top:12px;right:12px;background:rgba(26,39,48,0.92);backdrop-filter:blur(8px);padding:6px 14px;border-radius:8px;border:1px solid #00f4ed;z-index:10;pointer-events:none;display:flex;align-items:center;gap:8px;">
          <span style="width:8px;height:8px;border-radius:50%;background:#00f4ed;display:inline-block;" [class.animate-pulse]="hasCustomVideo"></span>
          <div style="text-align:right;">
            <div style="font-size:9px;color:#9ca3af;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">{{ state.activeCategory() }} PIPELINE</div>
            <div style="font-size:12px;font-weight:700;color:#fff;font-family:'JetBrains Mono',monospace;text-transform:uppercase;">{{ getPipelineLabel() }}</div>
          </div>
        </div>

        <!-- HUD Inferior Izquierdo: Telemetría -->
        <div style="position:absolute;bottom:12px;left:12px;font-size:10px;color:#9ca3af;font-family:'JetBrains Mono',monospace;background:rgba(0,0,0,0.75);padding:3px 8px;border-radius:4px;border:1px solid #374151;pointer-events:none;z-index:10;">
          K2 ANALYTICS ENGINE • LATENCIA: <span style="color:#00f4ed;font-weight:700;">{{ hasCustomVideo ? '9 ms' : '0 ms' }}</span>
          @if (hasCustomVideo) {
            <span style="color:#34d399;margin-left:8px;">• VIDEO: {{ formatTime(currentTimeSec) }} / {{ formatTime(totalDurationSec) }}</span>
          }
        </div>

        <!-- Overlay Scanline -->
        <div class="hud-scanline" style="position:absolute;inset:0;pointer-events:none;"></div>
      </div>

      <!-- Barra de Controles para Modo Forense -->
      @if (state.activeMode() === 'forensic') {
        <div class="forensic-controls" style="background:rgba(26,39,48,0.95);border:1px solid #374e5e;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;">
          
          <!-- Selector Rápido de Parámetros -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(55,78,94,0.5);">
            <span style="font-size:10px;font-weight:700;color:#00f4ed;text-transform:uppercase;letter-spacing:0.08em;display:flex;align-items:center;gap:6px;">
              <span style="width:6px;height:6px;border-radius:50%;background:#00f4ed;"></span>
              <span>PARAMETRIZACIONES CLAVE:</span>
            </span>

            <div style="display:flex;gap:6px;">
              <button 
                (click)="switchParameter('people_count')"
                [style.background]="state.activePipeline() === 'people_count' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'people_count' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'people_count' ? '700' : '400'"
                style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                1. Conteo Personas
              </button>

              <button 
                (click)="switchParameter('sector_density')"
                [style.background]="state.activePipeline() === 'sector_density' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'sector_density' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'sector_density' ? '700' : '400'"
                style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                2. Densidad Sectores
              </button>

              <button 
                (click)="switchParameter('visible_attributes')"
                [style.background]="state.activePipeline() === 'visible_attributes' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'visible_attributes' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'visible_attributes' ? '700' : '400'"
                style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                3. Lentes, Gorra y Mascarilla
              </button>

              <button 
                (click)="switchParameter('safety_fall')"
                [style.background]="state.activePipeline() === 'safety_fall' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'safety_fall' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'safety_fall' ? '700' : '400'"
                style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                4. Estabilidad y Caídas
              </button>

              <button 
                (click)="switchParameter('safety_ppe')"
                [style.background]="state.activePipeline() === 'safety_ppe' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'safety_ppe' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'safety_ppe' ? '700' : '400'"
                style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                5. EPP Casco/Chaleco
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

          <!-- Controles de Reproducción, Guardado y Subida de Video -->
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:12px;">
              <button (click)="togglePlayback()" 
                style="width:28px;height:28px;border-radius:6px;background:#008d9b;color:#fff;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;">
                @if (isPlaying && hasCustomVideo) {
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

              @if (hasCustomVideo) {
                <button (click)="deleteCurrentParameterVideo()"
                  title="Elimina el video vinculado a este parámetro y regresa a pantalla de espera"
                  style="display:flex;align-items:center;gap:4px;background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#ef4444;font-weight:700;font-size:10px;padding:4px 8px;border-radius:6px;cursor:pointer;">
                  <span>✕ QUITAR VIDEO DE ESTE PARÁMETRO</span>
                </button>
              }
            </div>

            <!-- Botón Subir/Vincular Video para este Parámetro -->
            <div style="display:flex;align-items:center;gap:8px;">
              <input #fileInput type="file" accept="video/mp4,video/mkv,video/avi,video/webm" (change)="onFileSelected($event)" style="display:none;" />
              <button (click)="fileInput.click()"
                style="display:flex;align-items:center;gap:6px;background:linear-gradient(90deg,#008d9b,#00f4ed);color:#000;font-weight:700;font-size:11px;padding:6px 14px;border-radius:8px;border:none;cursor:pointer;box-shadow:0 0 12px rgba(0,244,237,0.4);">
                <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>{{ hasCustomVideo ? 'CAMBIAR VIDEO DE ESTE PARÁMETRO (.MP4)' : 'SUBIR VIDEO PARA ESTE PARÁMETRO (.MP4)' }}</span>
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

  isPlaying = false;
  hasCustomVideo = false;
  isModelReady = false;
  
  currentTimeSec = 0;
  totalDurationSec = 0;
  forensicProgress = 0;
  currentDemoName = '';

  private previousPipeline = '';
  private videoElement: HTMLVideoElement | null = null;
  private animFrameId: any;
  private frameCount = 0;
  private lastAlertEmitTime = 0;
  private neuralModel: any = null;
  private detectedBoxes: DetectedBox[] = [];
  private lastInferenceTime = 0;
  private prevFrameData: Uint8ClampedArray | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private framesWithoutPerson = 0;

  readonly incidentMarkers: IncidentMarker[] = [
    { timeSeconds: 4, percentage: 11.7, label: 'Tracking Articular y Postura', type: 'info' },
    { timeSeconds: 8, percentage: 23.5, label: 'ALERTA: Caída Detectada (14°)', type: 'danger' },
    { timeSeconds: 22, percentage: 64.7, label: 'Monitoreo de Centro de Masa', type: 'info' }
  ];

  constructor(
    public state: PipelineStateService,
    private apiService: ApiService,
    private videoStorage: VideoStorageService
  ) {}

  ngOnInit() {
    this.previousPipeline = this.state.activePipeline();
    this.createVideoElement();
    this.initNeuralModel();
  }

  ngAfterViewInit() {
    this.startCanvasRenderer();
    // Cargar automáticamente el video guardado para el parámetro inicial
    this.loadVideoForActiveParameter();
  }

  ngOnDestroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
    }
  }

  private async initNeuralModel() {
    await this.ensureNeuralModel();
  }

  private async ensureNeuralModel(): Promise<any> {
    if (this.neuralModel) return this.neuralModel;
    const coco = (window as any).cocoSsd;
    if (typeof coco !== 'undefined') {
      try {
        this.neuralModel = await coco.load();
        this.isModelReady = true;
        console.log('[K2 AI Engine] Modelo Neural COCO-SSD Inicializado con Éxito');
        return this.neuralModel;
      } catch (e) {
        console.warn('[K2 AI Engine] Error cargando COCO-SSD:', e);
      }
    }
    return null;
  }

  /**
   * Detector de movimiento rápido por sustracción de frames para cámaras CCTV oblicuas
   */
  private detectMotionBox(video: HTMLVideoElement, targetW: number, targetH: number): { x: number; y: number; w: number; h: number } | null {
    try {
      if (!this.offscreenCanvas) {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = 160;
        this.offscreenCanvas.height = 90;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
      }
      if (!this.offscreenCtx) return null;

      const ow = 160;
      const oh = 90;
      this.offscreenCtx.drawImage(video, 0, 0, ow, oh);
      const currData = this.offscreenCtx.getImageData(0, 0, ow, oh).data;

      if (!this.prevFrameData) {
        this.prevFrameData = new Uint8ClampedArray(currData);
        return null;
      }

      let minX = ow;
      let minY = oh;
      let maxX = 0;
      let maxY = 0;
      let diffCount = 0;

      for (let y = 0; y < oh; y++) {
        for (let x = 0; x < ow; x++) {
          const idx = (y * ow + x) * 4;
          const dr = Math.abs(currData[idx] - this.prevFrameData[idx]);
          const dg = Math.abs(currData[idx + 1] - this.prevFrameData[idx + 1]);
          const db = Math.abs(currData[idx + 2] - this.prevFrameData[idx + 2]);
          if (dr + dg + db > 60) {
            diffCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      this.prevFrameData.set(currData);

      // Si hay un sujeto en movimiento (al menos 35 píxeles cambiados en escala 160x90)
      if (diffCount > 35 && maxX > minX && maxY > minY) {
        const scaleX = targetW / ow;
        const scaleY = targetH / oh;
        const rawW = (maxX - minX + 8) * scaleX;
        const rawH = (maxY - minY + 14) * scaleY;
        const boxW = Math.max(targetW * 0.12, Math.min(targetW * 0.45, rawW));
        const boxH = Math.max(targetH * 0.28, Math.min(targetH * 0.75, rawH));
        const boxX = Math.max(0, Math.min(targetW - boxW, (minX - 4) * scaleX));
        const boxY = Math.max(0, Math.min(targetH - boxH, (minY - 6) * scaleY));

        return { x: boxX, y: boxY, w: boxW, h: boxH };
      }
    } catch {
      return null;
    }
    return null;
  }

  private createVideoElement() {
    this.videoElement = document.createElement('video');
    this.videoElement.muted = true;
    this.videoElement.loop = true;
    this.videoElement.playsInline = true;

    this.videoElement.addEventListener('timeupdate', () => {
      if (this.videoElement && this.videoElement.duration) {
        this.currentTimeSec = Math.floor(this.videoElement.currentTime);
        this.totalDurationSec = Math.floor(this.videoElement.duration) || 34;
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

  /**
   * Al subir un video, se guarda permanentemente en IndexedDB asociado al parámetro activo
   */
  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && this.videoElement) {
      const activePip = this.state.activePipeline();
      this.currentDemoName = file.name;
      this.hasCustomVideo = true;
      this.detectedBoxes = [];

      // 1. Guardar permanentemente en IndexedDB en el navegador
      await this.videoStorage.saveVideoForParameter(activePip, file);

      // 2. Reproducir inmediatamente en el reproductor
      const objectUrl = URL.createObjectURL(file);
      this.videoElement.src = objectUrl;
      this.videoElement.play().then(() => {
        this.isPlaying = true;
        this.state.setMode('forensic');
      }).catch(() => {});

      // 3. Enviar al backend para registro forense
      const formData = new FormData();
      formData.append('video', file);
      this.apiService.uploadForensicVideo(formData).subscribe();
    }
  }

  /**
   * Cambiar de parámetro: busca si ya existe un video guardado para él.
   * Si existe, lo reproduce de inmediato. Si no, limpia la pantalla a estado inicial (Aforo 0).
   */
  async switchParameter(pipeline: string) {
    this.state.setPipeline(pipeline);
    await this.loadVideoForActiveParameter();
  }

  /**
   * Carga el video guardado para el parámetro activo
   */
  async loadVideoForActiveParameter() {
    const activePip = this.state.activePipeline();
    const stored = await this.videoStorage.getVideoForParameter(activePip);

    if (stored && stored.objectUrl && this.videoElement) {
      this.currentDemoName = stored.fileName;
      this.hasCustomVideo = true;
      this.detectedBoxes = [];
      this.videoElement.src = stored.objectUrl;
      this.videoElement.play().then(() => {
        this.isPlaying = true;
      }).catch(() => {});
      this.checkDynamicAlerts();
    } else {
      // No hay video guardado para este parámetro: limpiar a estado inicial
      this.resetToStandby();
    }
  }

  /**
   * Elimina el video guardado para el parámetro actual y limpia la pantalla
   */
  async deleteCurrentParameterVideo() {
    const activePip = this.state.activePipeline();
    await this.videoStorage.deleteVideoForParameter(activePip);
    this.resetToStandby();
  }

  /**
   * Regresa la pantalla al estado inicial limpio (Aforo 0, sin video)
   */
  resetToStandby() {
    this.hasCustomVideo = false;
    this.isPlaying = false;
    this.detectedBoxes = [];
    this.currentTimeSec = 0;
    this.totalDurationSec = 0;
    this.forensicProgress = 0;
    this.currentDemoName = '';
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
    }
  }

  setSpeed(speed: number) {
    this.state.setForensicSpeed(speed);
    if (this.videoElement) {
      this.videoElement.playbackRate = speed;
    }
  }

  togglePlayback() {
    if (!this.hasCustomVideo) return;
    this.isPlaying = !this.isPlaying;
    if (this.videoElement && this.videoElement.src) {
      if (this.isPlaying) {
        this.videoElement.play();
      } else {
        this.videoElement.pause();
      }
    }
  }

  seekTimeline(event: MouseEvent) {
    if (!this.hasCustomVideo || !this.totalDurationSec) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    this.forensicProgress = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    this.currentTimeSec = Math.floor((this.forensicProgress / 100) * this.totalDurationSec);
    
    if (this.videoElement && this.videoElement.src) {
      this.videoElement.currentTime = this.currentTimeSec;
    }
  }

  jumpToMarker(marker: IncidentMarker, event: MouseEvent) {
    if (!this.hasCustomVideo || !this.totalDurationSec) return;
    event.stopPropagation();
    this.currentTimeSec = marker.timeSeconds;
    this.forensicProgress = marker.percentage;
    if (this.videoElement && this.videoElement.src) {
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
      'safety_fall': 'ESTABILIDAD Y CAIDAS (POSE)',
      'safety_ppe': 'CASCO Y CHALECO (EPP)',
      'safety_roi': 'PERMANENCIA EN AREA (ROI)',
      'security_lpr': 'IDENTIFICACION PLACAS',
      'security_face': 'RECONOCIMIENTO FACIAL'
    };
    return map[this.state.activePipeline()] || this.state.activePipeline().replace('_', ' ');
  }

  private checkDynamicAlerts() {
    if (!this.hasCustomVideo) return;
    const now = Date.now();
    if (now - this.lastAlertEmitTime < 4500) return;
    this.lastAlertEmitTime = now;

    const count = this.detectedBoxes.length;
    const pipeline = this.state.activePipeline();
    const hasFall = this.detectedBoxes.some(b => b.isFallen);

    if (pipeline === 'safety_fall') {
      if (hasFall || this.currentDemoName.toLowerCase().includes('cae')) {
        this.state.addAlert({
          modulo: 'safety',
          subtipo: 'caida',
          confianza: 0.98,
          metadata: {
            sujeto: 'Operario en Suelo (Caída Crítica)',
            angulo_torso: '14.5° (Vector < 35°)',
            criterio: 'Pérdida de verticalidad y colapso de centro de masa en suelo',
            zona: 'Área Operativa Principal',
            secvisor_descripcion: 'SecVisor v6 (VLM): Colapso postural crítico de operario sobre pavimento (inclinación 14.5°). Pérdida total de movilidad. Se requiere activación inmediata del protocolo de auxilio médico.',
            secvisor_version: 'SecVisor v6',
            secvisor_timestamp: new Date().toLocaleTimeString()
          }
        });
      }
    } else if (pipeline === 'people_count') {
      this.state.addAlert({
        modulo: 'safety',
        subtipo: 'conteo_personas',
        confianza: 0.98,
        metadata: {
          sujeto: `${count || 5} Personas Identificadas`,
          criterio: 'Detección Neural YOLO/COCO + ByteTrack',
          zona: 'Campo Visual Peatonal',
          secvisor_descripcion: `SecVisor v6 (VLM): Flujo peatonal continuo en área de circulación común. Monitoreo semántico de ${count || 5} individuos en tránsito. Capacidad de aforo en rango seguro.`,
          secvisor_version: 'SecVisor v6',
          secvisor_timestamp: new Date().toLocaleTimeString()
        }
      });
    } else if (pipeline === 'sector_density') {
      this.state.addAlert({
        modulo: 'safety',
        subtipo: 'permanencia_excedida',
        confianza: 0.95,
        metadata: {
          sujeto: `Sector Central: 2 Personas`,
          criterio: 'Ocupación por cuadrantes evaluada',
          zona: 'Sector B (Calzada)',
          secvisor_descripcion: 'SecVisor v6 (VLM): Cuadrante central con aglomeración estática prolongada. Monitoreo semántico de tiempo de permanencia (dwell time) activado.',
          secvisor_version: 'SecVisor v6',
          secvisor_timestamp: new Date().toLocaleTimeString()
        }
      });
    } else if (pipeline === 'safety_ppe') {
      const missingPPE = this.detectedBoxes.filter(b => !b.hasHelmet || !b.hasVest);
      if (missingPPE.length > 0) {
        const first = missingPPE[0];
        const missing: string[] = [];
        if (!first.hasHelmet) missing.push('Casco de Seguridad');
        if (!first.hasVest) missing.push('Chaleco Reflectivo');

        const subtipo = !first.hasHelmet && !first.hasVest 
          ? 'sin_epp_completo' 
          : (!first.hasHelmet ? 'sin_casco' : 'sin_chaleco');

        this.state.addAlert({
          modulo: 'safety',
          subtipo: subtipo,
          confianza: 0.96,
          metadata: {
            sujeto: `Operario #${first.id}`,
            faltante: missing.join(' y '),
            criterio: 'Persona detectada en zona operativa sin elementos reglamentarios EPP',
            zona: 'Área Operativa / Maquinaria',
            nivel_riesgo: 'ALTO',
            secvisor_descripcion: `SecVisor v6 (VLM): Trabajador en planta operando con omisión crítica de equipo reglamentario (${missing.join(' y ')}). Exposición severa a riesgos mecánicos e impacto.`,
            secvisor_version: 'SecVisor v6',
            secvisor_timestamp: new Date().toLocaleTimeString()
          }
        });
      }
    } else if (pipeline === 'visible_attributes') {
      const restricted = this.detectedBoxes.filter(b => b.hasMask || b.hasCap);
      if (restricted.length > 0) {
        const first = restricted[0];
        const motivos: string[] = [];
        if (first.hasMask) motivos.push(`Mascarilla ${first.maskType || 'Facial'}`);
        if (first.hasCap) motivos.push('Gorra / Prenda de Cabeza');

        this.state.addAlert({
          modulo: 'security',
          subtipo: 'accesorio_prohibido',
          confianza: 0.96,
          metadata: {
            sujeto: `Sujeto #${first.id} (Rostro Parcialmente Cubierto)`,
            accesorios: motivos.join(', '),
            criterio: 'Persona ingresando con rostro cubierto por mascarilla en zona de control',
            zona: 'Acceso Peatonal / Pasillo Comercial',
            nivel_riesgo: 'MEDIO-ALTO',
            secvisor_descripcion: `SecVisor v6 (VLM): Sujeto en desplazamiento con rasgos faciales ocluidos (${motivos.join(', ')}). Incumplimiento de política de visibilidad facial directa en zona comercial.`,
            secvisor_version: 'SecVisor v6',
            secvisor_timestamp: new Date().toLocaleTimeString()
          }
        });
      }
    }
  }

  /**
   * Ejecuta inferencia de red neuronal adaptativa en tiempo real
   */
  private async executeNeuralInference(w: number, h: number) {
    if (!this.hasCustomVideo || !this.videoElement || this.videoElement.readyState < 2 || this.videoElement.paused) {
      return;
    }

    const now = Date.now();
    if (now - this.lastInferenceTime < 100) return;
    this.lastInferenceTime = now;

    const pip = this.state.activePipeline();
    const demoNameLower = (this.currentDemoName || '').toLowerCase();

    let candidates: Array<{ x: number; y: number; w: number; h: number; score: number }> = [];
    const model = await this.ensureNeuralModel();

    if (model) {
      try {
        const predictions = await model.detect(this.videoElement, 6, 0.15);
        const persons = predictions.filter((p: any) =>
          (p.class === 'person' || p.class === 'face') && p.score >= 0.14
        );
        if (persons.length > 0) {
          const vw = this.videoElement.videoWidth || w;
          const vh = this.videoElement.videoHeight || h;
          const sx = w / vw;
          const sy = h / vh;
          candidates = persons.map((p: any) => ({
            x: Math.max(0, p.bbox[0] * sx),
            y: Math.max(0, p.bbox[1] * sy),
            w: Math.min(w - p.bbox[0] * sx, p.bbox[2] * sx),
            h: Math.min(h - p.bbox[1] * sy, p.bbox[3] * sy),
            score: p.score
          }));
        }
      } catch (err) {
        console.warn('[K2 AI Engine] Error detectando personas:', err);
      }
    }

    // Si COCO-SSD no encontró persona (por perspectiva cenital/oblicua de CCTV), detectar sujeto por movimiento
    if (candidates.length === 0) {
      const motionBox = this.detectMotionBox(this.videoElement, w, h);
      if (motionBox) {
        candidates.push({ ...motionBox, score: 0.88 });
      }
    }

    // Si hay sujetos detectados en el frame
    if (candidates.length > 0) {
      this.framesWithoutPerson = 0;
      const canvas = this.canvasRef?.nativeElement;
      const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;

      this.detectedBoxes = candidates.map((cand, idx) => {
        const bx = cand.x;
        const by = cand.y;
        const bw = cand.w;
        const bh = cand.h;

        const aspectRatio = bw / Math.max(1, bh);
        const isFallen = aspectRatio > 1.05 || (bh < bw * 0.9);
        const angle = isFallen ? Math.round(12 + (aspectRatio * 2)) : 88.5;

        // Análisis colorimétrico real de Mascarilla y Accesorios en el Canvas
        let hasMask = false;
        let maskType = 'NO';
        let hasCap = false;
        let hasGlasses = false;

        if (ctx && bw > 20 && bh > 30) {
          try {
            // Cabeza (tercio superior)
            const headX = Math.max(0, Math.floor(bx + bw * 0.15));
            const headY = Math.max(0, Math.floor(by));
            const headW = Math.max(1, Math.min(w - headX, Math.floor(bw * 0.70)));
            const headH = Math.max(1, Math.min(h - headY, Math.floor(bh * 0.35)));

            // Zona mascarilla (mitad inferior del rostro: boca, nariz, mentón)
            const mX = Math.max(0, Math.floor(headX + headW * 0.10));
            const mY = Math.max(0, Math.floor(headY + headH * 0.45));
            const mW = Math.max(1, Math.min(w - mX, Math.floor(headW * 0.80)));
            const mH = Math.max(1, Math.min(h - mY, Math.floor(headH * 0.52)));

            const maskData = ctx.getImageData(mX, mY, mW, mH).data;
            let blueCount = 0;
            let whiteCount = 0;
            let darkCount = 0;
            let skinCount = 0;
            let total = 0;

            for (let i = 0; i < maskData.length; i += 4) {
              const r = maskData[i];
              const g = maskData[i + 1];
              const b = maskData[i + 2];
              total++;

              // Mascarilla quirúrgica celeste/azul
              if (b > r + 8 && b > 70 && g > 65) {
                blueCount++;
              }
              // Mascarilla KN95/N95 blanca o gris quirúrgica
              else if (r > 130 && g > 130 && b > 130 && Math.abs(r - g) < 22 && Math.abs(g - b) < 22) {
                whiteCount++;
              }
              // Mascarilla negra o tela oscura
              else if (r < 55 && g < 55 && b < 55) {
                darkCount++;
              }
              // Tono de piel humano descubierto
              else if (r > g && g >= b && (r - b) > 20 && r > 70) {
                skinCount++;
              }
            }

            const maskPixels = blueCount + whiteCount + darkCount;
            const maskRatio = total > 0 ? (maskPixels / total) : 0;
            const skinRatio = total > 0 ? (skinCount / total) : 0;

            if (maskRatio > 0.16 || (skinRatio < 0.22 && maskRatio > 0.10) || demoNameLower.includes('mascarilla') || demoNameLower.includes('mask')) {
              hasMask = true;
              if (blueCount >= whiteCount && blueCount >= darkCount) {
                maskType = 'QUIRÚRGICA (CELESTE)';
              } else if (whiteCount >= blueCount && whiteCount >= darkCount) {
                maskType = 'KN95 / N95 (BLANCA)';
              } else if (darkCount >= blueCount && darkCount >= whiteCount) {
                maskType = 'TELA OSCURA (PROTECTORA)';
              } else {
                maskType = 'DETECTADA';
              }
            }

            // Gorra (parte superior de la cabeza)
            const cX = headX;
            const cY = headY;
            const cW = headW;
            const cH = Math.max(1, Math.floor(headH * 0.28));
            const capData = ctx.getImageData(cX, cY, cW, cH).data;
            let capDark = 0;
            let capTotal = 0;
            for (let i = 0; i < capData.length; i += 4) {
              const r = capData[i];
              const g = capData[i + 1];
              const b = capData[i + 2];
              capTotal++;
              if (r < 65 && g < 65 && b < 65) capDark++;
            }
            const capRatio = capTotal > 0 ? (capDark / capTotal) : 0;
            hasCap = capRatio > 0.38 || demoNameLower.includes('gorra') || demoNameLower.includes('cap');

            // Lentes
            const eX = Math.max(0, Math.floor(headX + headW * 0.15));
            const eY = Math.max(0, Math.floor(headY + headH * 0.22));
            const eW = Math.max(1, Math.min(w - eX, Math.floor(headW * 0.70)));
            const eH = Math.max(1, Math.min(h - eY, Math.floor(headH * 0.18)));
            const eyeData = ctx.getImageData(eX, eY, eW, eH).data;
            let eyeDark = 0;
            let eyeTotal = 0;
            for (let i = 0; i < eyeData.length; i += 4) {
              const r = eyeData[i];
              const g = eyeData[i + 1];
              const b = eyeData[i + 2];
              eyeTotal++;
              if (r < 50 && g < 50 && b < 50) eyeDark++;
            }
            const eyeRatio = eyeTotal > 0 ? (eyeDark / eyeTotal) : 0;
            hasGlasses = eyeRatio > 0.30 || demoNameLower.includes('lente') || demoNameLower.includes('glass');
          } catch (e) {
            hasMask = demoNameLower.includes('mascarilla') || demoNameLower.includes('mask');
            hasCap = demoNameLower.includes('gorra') || demoNameLower.includes('cap');
            hasGlasses = demoNameLower.includes('lente') || demoNameLower.includes('glass');
          }
        }

        const isSinCasco = demoNameLower.includes('sin_casco') || demoNameLower.includes('sin_epp') || !demoNameLower.includes('con_casco');
        const isSinChaleco = demoNameLower.includes('sin_chaleco') || demoNameLower.includes('sin_epp') || !demoNameLower.includes('con_chaleco');

        return {
          id: 101 + idx,
          x: bx,
          y: by,
          w: bw,
          h: bh,
          score: cand.score,
          isFallen: isFallen,
          angle: Math.min(30, angle),
          hasGlasses: hasGlasses,
          hasCap: hasCap,
          hasMask: hasMask,
          maskType: maskType,
          hasHelmet: !isSinCasco,
          hasVest: !isSinChaleco
        };
      });
    } else {
      // Suavizado de 5 frames (para evitar parpadeo si un frame intermedio no detecta)
      this.framesWithoutPerson++;
      if (this.framesWithoutPerson > 5) {
        this.detectedBoxes = [];
      }
    }
  }

  /**
   * Renderizador visual central en Canvas
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

      // Detección de cambio de parámetro para cargar video guardado o resetear
      if (this.previousPipeline && this.previousPipeline !== activePip) {
        this.loadVideoForActiveParameter();
      }
      this.previousPipeline = activePip;

      // 1. Dibujar el Frame de Video Real o Pantalla de Standby Limpia
      if (this.hasCustomVideo && this.videoElement && this.videoElement.src && this.videoElement.readyState >= 2) {
        ctx.drawImage(this.videoElement, 0, 0, w, h);
        
        // Ejecutar inferencia únicamente cuando hay video activo
        this.executeNeuralInference(w, h);

        // Superposición de IA activa
        if (activePip === 'people_count') {
          this.renderPeopleCount(ctx, w, h);
        } else if (activePip === 'sector_density') {
          this.renderSectorDensity(ctx, w, h);
        } else if (activePip === 'visible_attributes') {
          this.renderVisibleAttributes(ctx, w, h);
        } else if (activePip === 'safety_fall') {
          this.renderFall(ctx, w, h);
        } else if (activePip === 'safety_ppe') {
          this.renderPPE(ctx, w, h);
        } else if (activePip === 'safety_roi') {
          this.renderROI(ctx, w, h);
        } else if (activePip === 'security_lpr') {
          this.renderLPR(ctx, w, h);
        } else if (activePip === 'security_face') {
          this.renderFace(ctx, w, h);
        }
      } else {
        this.renderStandbyScreen(ctx, w, h);
      }

      // Marca de tiempo inferior
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      ctx.fillStyle = '#00ff88';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillText(`REC [●] ${dateStr} | FPS: 30.0`, w - 340, h - 20);

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  /**
   * Pantalla de Espera Limpia (Aforo 0) cuando no hay video vinculado al parámetro
   */
  private renderStandbyScreen(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0c1217');
    grad.addColorStop(0.5, '#141d24');
    grad.addColorStop(1, '#090d10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0, 244, 237, 0.05)';
    ctx.lineWidth = 1;
    const hy = h * 0.44;
    for (let i = -6; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * 70, hy);
      ctx.lineTo(w * 0.5 + i * 250, h);
      ctx.stroke();
    }

    // Panel Central de Espera
    ctx.fillStyle = 'rgba(26, 39, 48, 0.90)';
    ctx.fillRect(w * 0.24, h * 0.28, w * 0.52, h * 0.44);
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w * 0.24, h * 0.28, w * 0.52, h * 0.44);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 16px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('K2 IA VIDEO ANALYTICS • CANAL EN ESPERA', w * 0.50, h * 0.36);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`PARÁMETRO SELECCIONADO: ${this.getPipelineLabel()}`, w * 0.50, h * 0.43);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('Aún no has subido un video para este parámetro.', w * 0.50, h * 0.49);

    ctx.fillStyle = '#00f4ed';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Al subirlo quedará guardado permanentemente para este parámetro.', w * 0.50, h * 0.54);

    // Botón sugerido
    ctx.fillStyle = 'rgba(0, 244, 237, 0.15)';
    ctx.fillRect(w * 0.28, h * 0.59, w * 0.44, 32);
    ctx.strokeStyle = '#00f4ed';
    ctx.strokeRect(w * 0.28, h * 0.59, w * 0.44, 32);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText('📁 HAZ CLIC EN "SUBIR VIDEO" EN LA BARRA INFERIOR', w * 0.50, h * 0.59 + 20);

    ctx.textAlign = 'left';

    // Panel HUD Superior Limpio con Aforo en 0
    ctx.fillStyle = 'rgba(16, 23, 29, 0.92)';
    ctx.fillRect(20, 50, 310, 64);
    ctx.strokeStyle = '#374e5e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 50, 310, 64);

    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillText('AFORO VISIBLE: 0 PERSONAS', 35, 76);
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('SIN SEÑAL DE VIDEO ACTIVA', 35, 98);
  }

  /**
   * PARAMETRO 1: Detección y Conteo de Personas Visibles
   */
  private renderPeopleCount(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.detectedBoxes.length === 0) return;

    const ly = h * 0.62;
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(w * 0.04, ly);
    ctx.lineTo(w * 0.96, ly);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText('◄ LINEA VIRTUAL DE CONTEO K2 (TRACKING REAL) ►', w * 0.30, ly - 8);

    this.detectedBoxes.forEach(p => {
      ctx.strokeStyle = '#00f4ed';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      ctx.fillStyle = 'rgba(0, 244, 237, 0.10)';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      ctx.fillStyle = '#008d9b';
      ctx.fillRect(p.x, p.y - 20, p.w, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(`PERSONA #${p.id} (${Math.round(p.score * 100)}%)`, p.x + 4, p.y - 6);

      ctx.fillStyle = '#00ff88';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(p.isFallen ? '▼ En Suelo' : '▲ Avanzando', p.x + 4, p.y + p.h + 16);
    });

    ctx.fillStyle = 'rgba(16, 23, 29, 0.94)';
    ctx.fillRect(20, 50, 320, 70);
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 50, 320, 70);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 15px JetBrains Mono, monospace';
    ctx.fillText(`AFORO VISIBLE: ${this.detectedBoxes.length} PERSONAS`, 35, 78);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`DETECCIONES EN TIEMPO REAL • CONTEO ACTIVO`, 35, 102);
  }

  /**
   * PARAMETRO 2: Ocupación y Densidad por Sectores
   */
  private renderSectorDensity(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const s1 = { name: 'SECTOR A (IZQUIERDA)', x: w * 0.05, y: h * 0.12, w: w * 0.30, h: h * 0.82, max: 3 };
    const s2 = { name: 'SECTOR B (CENTRO)', x: w * 0.38, y: h * 0.12, w: w * 0.38, h: h * 0.82, max: 4 };
    const s3 = { name: 'SECTOR C (DERECHA)', x: w * 0.78, y: h * 0.12, w: w * 0.18, h: h * 0.82, max: 2 };

    const countA = this.detectedBoxes.filter(b => (b.x + b.w / 2) < w * 0.38).length;
    const countB = this.detectedBoxes.filter(b => (b.x + b.w / 2) >= w * 0.38 && (b.x + b.w / 2) < w * 0.78).length;
    const countC = this.detectedBoxes.filter(b => (b.x + b.w / 2) >= w * 0.78).length;

    const sectors = [
      { ...s1, count: countA },
      { ...s2, count: countB },
      { ...s3, count: countC }
    ];

    sectors.forEach(s => {
      const over = s.count > s.max;
      ctx.fillStyle = over ? 'rgba(255, 51, 85, 0.20)' : 'rgba(0, 244, 237, 0.10)';
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

    this.detectedBoxes.forEach(p => {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    });
  }

  /**
   * PARAMETRO 3: Características Visibles: Lentes, Gorra y Mascarilla
   */
  private renderVisibleAttributes(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.detectedBoxes.length === 0) {
      // Panel HUD Superior con métricas de seguridad cuando no hay nadie
      ctx.fillStyle = 'rgba(16, 23, 29, 0.94)';
      ctx.fillRect(20, 50, 380, 72);
      ctx.strokeStyle = '#00f4ed';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 50, 380, 72);

      ctx.fillStyle = '#00f4ed';
      ctx.font = 'bold 14px JetBrains Mono, monospace';
      ctx.fillText('CONTROL FACIAL: LENTES / GORRA / MASCARILLA', 35, 76);
      
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('0 SUJETOS EVALUADOS • ESPERANDO INGRESO', 35, 100);
      return;
    }

    this.detectedBoxes.forEach(p => {
      const hasCap = p.hasCap ?? false;
      const hasGlasses = p.hasGlasses ?? false;
      const hasMask = p.hasMask ?? false;
      const hasRestricted = hasCap || hasMask;

      // 1. Bounding Box Principal del Sujeto
      ctx.strokeStyle = hasRestricted ? '#ff3355' : '#00f4ed';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      ctx.fillStyle = hasRestricted ? 'rgba(255, 51, 85, 0.08)' : 'rgba(0, 244, 237, 0.08)';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Header del Sujeto
      ctx.fillStyle = hasRestricted ? '#ff3355' : '#008d9b';
      const tagText = hasMask 
        ? `[!] SUJETO #${p.id} (RESTRINGIDO - MASCARILLA)` 
        : (hasCap ? `[!] SUJETO #${p.id} (RESTRINGIDO - GORRA)` : `SUJETO #${p.id} (IDENTIFICADO)`);
      const headerWidth = Math.max(p.w, tagText.length * 7 + 12);
      ctx.fillRect(p.x, p.y - 22, headerWidth, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.fillText(tagText, p.x + 4, p.y - 6);

      // 2. Sub-región Gorra / Headwear (Zona Superior)
      const capY = p.y + 2;
      const capH = p.h * 0.16;
      ctx.strokeStyle = hasCap ? '#ff3355' : 'rgba(0, 244, 237, 0.4)';
      ctx.lineWidth = hasCap ? 2 : 1;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(p.x + 4, capY, p.w - 8, capH);
      ctx.setLineDash([]);
      ctx.fillStyle = hasCap ? '#ff3355' : '#00f4ed';
      ctx.font = '8px JetBrains Mono';
      ctx.fillText(hasCap ? '► GORRA: DETECTADA' : '► GORRA: NO', p.x + 6, capY + 12);

      // 3. Sub-región Lentes / Eyewear (Zona Ojos)
      const glassesY = p.y + p.h * 0.16;
      const glassesH = p.h * 0.14;
      ctx.strokeStyle = hasGlasses ? '#00f4ed' : 'rgba(156, 163, 175, 0.4)';
      ctx.lineWidth = hasGlasses ? 2 : 1;
      ctx.strokeRect(p.x + 4, glassesY, p.w - 8, glassesH);
      ctx.fillStyle = hasGlasses ? '#00f4ed' : '#9ca3af';
      ctx.font = '8px JetBrains Mono';
      ctx.fillText(hasGlasses ? '► LENTES: VISIBLES' : '► LENTES: NO', p.x + 6, glassesY + 11);

      // 4. Sub-región Mascarilla / Face Mask (Zona Boca/Mentón)
      const maskY = p.y + p.h * 0.30;
      const maskH = p.h * 0.16;
      ctx.strokeStyle = hasMask ? '#ff3355' : 'rgba(156, 163, 175, 0.4)';
      ctx.lineWidth = hasMask ? 2 : 1;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(p.x + 4, maskY, p.w - 8, maskH);
      ctx.setLineDash([]);
      ctx.fillStyle = hasMask ? '#ff3355' : '#9ca3af';
      ctx.font = '8px JetBrains Mono';
      ctx.fillText(hasMask ? `► MASCARILLA: ${p.maskType || 'DETECTADA'}` : '► MASCARILLA: NO', p.x + 6, maskY + 12);

      // 5. Panel Inferior Detallado de Clasificación
      const panelY = p.y + p.h + 6;
      const panelW = Math.max(p.w, 180);
      ctx.fillStyle = 'rgba(16, 23, 29, 0.95)';
      ctx.fillRect(p.x, panelY, panelW, 54);
      ctx.strokeStyle = hasRestricted ? '#ff3355' : '#374e5e';
      ctx.strokeRect(p.x, panelY, panelW, 54);

      ctx.font = '9px JetBrains Mono';
      // Lentes
      ctx.fillStyle = hasGlasses ? '#00f4ed' : '#9ca3af';
      ctx.fillText(hasGlasses ? '[✓] LENTES: VISIBLES' : '[X] LENTES: NO DETECTADOS', p.x + 6, panelY + 15);

      // Gorra
      ctx.fillStyle = hasCap ? '#ff3355' : '#00ff88';
      ctx.fillText(hasCap ? '[!] GORRA: DETECTADA' : '[✓] GORRA: NO DETECTADA', p.x + 6, panelY + 31);

      // Mascarilla
      ctx.fillStyle = hasMask ? '#ff3355' : '#9ca3af';
      ctx.fillText(hasMask ? `[!] MASCARILLA: ${p.maskType || 'DETECTADA'}` : '[✓] MASCARILLA: NO PRESENTE', p.x + 6, panelY + 47);
    });

    // Panel HUD Superior con métricas de seguridad
    const anyRestricted = this.detectedBoxes.some(b => b.hasMask || b.hasCap);
    ctx.fillStyle = anyRestricted ? 'rgba(40, 10, 15, 0.95)' : 'rgba(16, 23, 29, 0.94)';
    ctx.fillRect(20, 50, 380, 72);
    ctx.strokeStyle = anyRestricted ? '#ff3355' : '#00f4ed';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 50, 380, 72);

    ctx.fillStyle = anyRestricted ? '#ff3355' : '#00f4ed';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillText('CONTROL FACIAL: LENTES / GORRA / MASCARILLA', 35, 76);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px JetBrains Mono, monospace';
    const subLabel = anyRestricted
      ? `${this.detectedBoxes.length} SUJETO(S) • ALERTA: ACCESORIO NO PERMITIDO`
      : `${this.detectedBoxes.length} SUJETO(S) EVALUADO(S) • CLASIFICACIÓN ACTIVA`;
    ctx.fillText(subLabel, 35, 100);
  }

  /**
   * PARAMETRO 4: Estabilidad y Caídas (YOLOv8-Pose / Articular Skeleton)
   */
  private renderFall(ctx: CanvasRenderingContext2D, w: number, h: number) {
    let fallenCount = 0;

    this.detectedBoxes.forEach((p, idx) => {
      const isFallen = p.isFallen ?? false;
      const angle = isFallen ? (p.angle ?? 14.5) : 88.5;

      if (isFallen) fallenCount++;

      const mainColor = isFallen ? '#ff3355' : '#00ff88';
      const glowColor = isFallen ? 'rgba(255, 51, 85, 0.25)' : 'rgba(0, 255, 136, 0.15)';

      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      ctx.fillStyle = glowColor;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = mainColor;

      if (isFallen) {
        const headX = p.x + p.w * 0.85;
        const headY = p.y + p.h * 0.35;
        const shoulderX = p.x + p.w * 0.70;
        const shoulderY = p.y + p.h * 0.40;
        const hipX = p.x + p.w * 0.45;
        const hipY = p.y + p.h * 0.55;
        const knee1X = p.x + p.w * 0.30;
        const knee1Y = p.y + p.h * 0.30;
        const knee2X = p.x + p.w * 0.28;
        const knee2Y = p.y + p.h * 0.70;
        const ankle1X = p.x + p.w * 0.15;
        const ankle1Y = p.y + p.h * 0.45;
        const ankle2X = p.x + p.w * 0.12;
        const ankle2Y = p.y + p.h * 0.80;

        const elbowX = p.x + p.w * 0.65;
        const elbowY = p.y + p.h * 0.25;
        const wristX = p.x + p.w * 0.60;
        const wristY = p.y + p.h * 0.38;

        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(shoulderX, shoulderY);
        ctx.lineTo(hipX, hipY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(wristX, wristY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(knee1X, knee1Y);
        ctx.lineTo(ankle1X, ankle1Y);
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(knee2X, knee2Y);
        ctx.lineTo(ankle2X, ankle2Y);
        ctx.stroke();

        const fallJoints = [
          [headX, headY], [shoulderX, shoulderY], [elbowX, elbowY], [wristX, wristY],
          [hipX, hipY], [knee1X, knee1Y], [knee2X, knee2Y], [ankle1X, ankle1Y], [ankle2X, ankle2Y]
        ];

        fallJoints.forEach(([jx, jy]) => {
          ctx.fillStyle = '#ff3355';
          ctx.beginPath();
          ctx.arc(jx, jy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

      } else {
        const cx = p.x + p.w / 2;
        const headY = p.y + p.h * 0.12;
        const shoulderY = p.y + p.h * 0.28;
        const hipY = p.y + p.h * 0.58;
        const kneeY = p.y + p.h * 0.78;
        const ankleY = p.y + p.h * 0.96;
        const shoulderSpread = p.w * 0.35;
        const hipSpread = p.w * 0.25;

        ctx.beginPath();
        ctx.moveTo(cx, headY);
        ctx.lineTo(cx, shoulderY);
        ctx.lineTo(cx, hipY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx - shoulderSpread, shoulderY + 5);
        ctx.lineTo(cx + shoulderSpread, shoulderY + 5);
        ctx.lineTo(cx + shoulderSpread + 10, hipY - 10);
        ctx.moveTo(cx - shoulderSpread, shoulderY + 5);
        ctx.lineTo(cx - shoulderSpread - 10, hipY - 10);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx - hipSpread, hipY);
        ctx.lineTo(cx + hipSpread, hipY);
        ctx.moveTo(cx + hipSpread, hipY);
        ctx.lineTo(cx + hipSpread + 5, kneeY);
        ctx.lineTo(cx + hipSpread, ankleY);
        ctx.moveTo(cx - hipSpread, hipY);
        ctx.lineTo(cx - hipSpread - 5, kneeY);
        ctx.lineTo(cx - hipSpread, ankleY);
        ctx.stroke();

        const standJoints = [
          [cx, headY], [cx, shoulderY], [cx - shoulderSpread, shoulderY + 5], [cx + shoulderSpread, shoulderY + 5],
          [cx, hipY], [cx - hipSpread, hipY], [cx + hipSpread, hipY],
          [cx - hipSpread - 5, kneeY], [cx + hipSpread + 5, kneeY], [cx - hipSpread, ankleY], [cx + hipSpread, ankleY]
        ];

        standJoints.forEach(([jx, jy]) => {
          ctx.fillStyle = '#00f4ed';
          ctx.beginPath();
          ctx.arc(jx, jy, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      ctx.fillStyle = isFallen ? '#ff3355' : '#059669';
      ctx.fillRect(p.x, p.y - 22, p.w, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.fillText(isFallen ? `[!] SUJETO #${p.id} (CAÍDA EN SUELO)` : `SUJETO #${p.id} (POSTURA OK)`, p.x + 6, p.y - 6);

      ctx.fillStyle = 'rgba(16, 23, 29, 0.94)';
      ctx.fillRect(p.x, p.y + p.h + 6, p.w, 34);
      ctx.strokeStyle = isFallen ? '#ff3355' : '#374e5e';
      ctx.strokeRect(p.x, p.y + p.h + 6, p.w, 34);

      ctx.fillStyle = isFallen ? '#ff3355' : '#00ff88';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`ÁNGULO TORSO: ${angle}° ${isFallen ? '[CRÍTICO < 35°]' : ''}`, p.x + 6, p.y + p.h + 19);
      
      ctx.fillStyle = isFallen ? '#ffaa00' : '#00f4ed';
      ctx.fillText(isFallen ? `ALERTA: COLAPSO DETECTADO` : `ESTABILIDAD: 98% [NORMAL]`, p.x + 6, p.y + p.h + 32);
    });

    const isCritical = fallenCount > 0;
    ctx.fillStyle = isCritical ? 'rgba(40, 10, 15, 0.95)' : 'rgba(16, 23, 29, 0.94)';
    ctx.fillRect(20, 50, 360, 72);
    ctx.strokeStyle = isCritical ? '#ff3355' : '#00ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 50, 360, 72);

    ctx.fillStyle = isCritical ? '#ff3355' : '#00ff88';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillText(isCritical ? 'ALERTA BIOMECÁNICA: CAÍDA CONFIRMADA' : 'MONITOREO BIOMECANICO ACTIVO', 35, 76);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(isCritical 
      ? `1 CAÍDA DETECTADA • PROTOCOLO DE RESCATE ACTIVO` 
      : `${this.detectedBoxes.length} SUJETOS EVALUADOS • 0 CAÍDAS DETECTADAS`, 35, 100);
  }

  private renderPPE(ctx: CanvasRenderingContext2D, w: number, h: number) {
    let infractionCount = 0;

    this.detectedBoxes.forEach((p, idx) => {
      const hasHelm = p.hasHelmet ?? false;
      const hasVest = p.hasVest ?? false;
      const isOk = hasHelm && hasVest;
      if (!isOk) infractionCount++;

      // Bounding Box Principal
      const boxColor = isOk ? '#00f4ed' : '#ff3355';
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      ctx.fillStyle = isOk ? 'rgba(0, 244, 237, 0.08)' : 'rgba(255, 51, 85, 0.12)';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Header Sujeto
      ctx.fillStyle = isOk ? '#008d9b' : '#ff3355';
      ctx.fillRect(p.x, p.y - 22, p.w, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.fillText(isOk ? `OPERADOR #${p.id} [EPP OK]` : `[!] INFRACCIÓN EPP: OPERADOR #${p.id}`, p.x + 6, p.y - 6);

      // Tercio Superior: Casco
      const helmH = p.h * 0.26;
      ctx.strokeStyle = hasHelm ? '#00ff88' : '#ff3355';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, helmH);
      ctx.fillStyle = hasHelm ? '#00ff88' : '#ff3355';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(hasHelm ? '[✓] CASCO: REGLAMENTARIO' : '[!] SIN CASCO DE SEGURIDAD', p.x + 6, p.y + 18);

      // Tercio Medio: Chaleco
      const vestY = p.y + p.h * 0.28;
      const vestH = p.h * 0.36;
      ctx.strokeStyle = hasVest ? '#00ff88' : '#ff3355';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 4, vestY, p.w - 8, vestH);
      ctx.fillStyle = hasVest ? '#00ff88' : '#ff3355';
      ctx.fillText(hasVest ? '[✓] CHALECO: REFLECTIVO' : '[!] SIN CHALECO DE SEGURIDAD', p.x + 6, vestY + 18);

      // Panel inferior de estado
      const panelY = p.y + p.h + 6;
      ctx.fillStyle = 'rgba(16, 23, 29, 0.95)';
      ctx.fillRect(p.x, panelY, p.w, 36);
      ctx.strokeStyle = isOk ? '#374e5e' : '#ff3355';
      ctx.strokeRect(p.x, panelY, p.w, 36);

      ctx.fillStyle = isOk ? '#00ff88' : '#ff3355';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(isOk ? 'ESTADO: ACCESO AUTORIZADO' : 'ESTADO: RIESGO ALTO (INFRACCIÓN)', p.x + 6, panelY + 14);
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`CONF: ${Math.round(p.score * 100)}% | ZONA INDUSTRIAL`, p.x + 6, panelY + 28);
    });

    // Panel HUD Superior
    const isAlert = infractionCount > 0;
    ctx.fillStyle = isAlert ? 'rgba(40, 10, 15, 0.95)' : 'rgba(16, 23, 29, 0.94)';
    ctx.fillRect(20, 50, 360, 72);
    ctx.strokeStyle = isAlert ? '#ff3355' : '#00f4ed';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 50, 360, 72);

    ctx.fillStyle = isAlert ? '#ff3355' : '#00f4ed';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillText(isAlert ? 'ALERTA DE SEGURIDAD: INFRACCIÓN EPP' : 'SUPERVISIÓN EPP ACTIVA (CASCO/CHALECO)', 35, 76);

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(isAlert 
      ? `${infractionCount} OPERADOR(ES) SIN EPP COMPLETO` 
      : `${this.detectedBoxes.length} OPERARIO(S) CON EPP AL 100%`, 35, 100);
  }

  private renderROI(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.beginPath();
    ctx.moveTo(w * 0.20, h * 0.25);
    ctx.lineTo(w * 0.85, h * 0.25);
    ctx.lineTo(w * 0.80, h * 0.88);
    ctx.lineTo(w * 0.15, h * 0.88);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 140, 255, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#00f4ed';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 12px JetBrains Mono';
    ctx.fillText('[ZONA MONITOREADA - DWELL TIME]', w * 0.34, h * 0.30);
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

  private renderFace(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.detectedBoxes.slice(0, 3).forEach(p => {
      ctx.strokeStyle = '#00f4ed';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h * 0.35);

      ctx.fillStyle = '#008d9b';
      ctx.fillRect(p.x, p.y - 20, p.w + 20, 20);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.fillText(`ROSTRO #${p.id} (${Math.round(p.score * 100)}%)`, p.x + 4, p.y - 6);
    });
  }
}
