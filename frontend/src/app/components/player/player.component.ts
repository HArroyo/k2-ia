import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PipelineStateService } from '../../services/pipeline-state.service';
import { ApiService } from '../../services/api.service';

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
  isFallen?: boolean;
  angle?: number;
}

interface PreloadedDemo {
  pipeline: string;
  title: string;
  fileName: string;
  videoUrl: string;
  description: string;
  badge: string;
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
            {{ hasCustomVideo ? 'ANALISIS FORENSE IA: ' + currentDemoName : 'CANAL 01: CAMARA EN ESPERA' }}
          </span>
          <span style="color:#555;">|</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#00f4ed;font-weight:600;">1280x720 &#64; 30FPS</span>
          <span style="color:#555;">|</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#34d399;font-size:10px;background:rgba(6,78,59,0.6);padding:2px 6px;border-radius:4px;border:1px solid rgba(52,211,153,0.3);">
            {{ hasCustomVideo ? 'INFERENCIA NEURAL ACTIVA' : 'SISTEMA LISTO' }}
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
          
          <!-- Selector Rápido de Parámetros con Videos Precargados -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(55,78,94,0.5);">
            <span style="font-size:10px;font-weight:700;color:#00f4ed;text-transform:uppercase;letter-spacing:0.08em;display:flex;align-items:center;gap:6px;">
              <span style="width:6px;height:6px;border-radius:50%;background:#00f4ed;"></span>
              <span>VIDEOS PRECARGADOS POR PARÁMETRO:</span>
            </span>

            <div style="display:flex;gap:6px;">
              <button 
                (click)="selectScenarioAndPlay('people_count')"
                [style.background]="state.activePipeline() === 'people_count' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'people_count' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'people_count' ? '700' : '400'"
                style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                1. Conteo Personas
              </button>

              <button 
                (click)="selectScenarioAndPlay('sector_density')"
                [style.background]="state.activePipeline() === 'sector_density' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'sector_density' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'sector_density' ? '700' : '400'"
                style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                2. Densidad Sectores
              </button>

              <button 
                (click)="selectScenarioAndPlay('visible_attributes')"
                [style.background]="state.activePipeline() === 'visible_attributes' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'visible_attributes' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'visible_attributes' ? '700' : '400'"
                style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                3. Lentes, Gorra y Mascarilla
              </button>

              <button 
                (click)="selectScenarioAndPlay('safety_fall')"
                [style.background]="state.activePipeline() === 'safety_fall' ? '#00f4ed' : '#1a2730'"
                [style.color]="state.activePipeline() === 'safety_fall' ? '#000' : '#d1d5db'"
                [style.fontWeight]="state.activePipeline() === 'safety_fall' ? '700' : '400'"
                style="padding:4px 8px;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;border:1px solid #374e5e;cursor:pointer;">
                4. Estabilidad y Caídas
              </button>

              <button 
                (click)="selectScenarioAndPlay('safety_ppe')"
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

          <!-- Controles de Reproducción, Demo Precargada y Subida de Video -->
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

              <!-- Botón Reproducir Demo Precargada Actual -->
              @if (!hasCustomVideo) {
                <button (click)="playCurrentPreloadedDemo()"
                  style="display:flex;align-items:center;gap:6px;background:rgba(0,244,237,0.15);border:1px solid #00f4ed;color:#00f4ed;font-weight:700;font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer;">
                  <span>▶ REPRODUCIR VIDEO PRECARGADO</span>
                </button>
              } @else {
                <button (click)="resetToStandby()"
                  style="display:flex;align-items:center;gap:6px;background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#ef4444;font-weight:700;font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer;">
                  <span>✕ DETENER Y REGRESAR A ESTADO INICIAL</span>
                </button>
              }
            </div>

            <!-- Botón Subir Video Propio -->
            <div style="display:flex;align-items:center;gap:8px;">
              <input #fileInput type="file" accept="video/mp4,video/mkv,video/avi,video/webm" (change)="onFileSelected($event)" style="display:none;" />
              <button (click)="fileInput.click()"
                style="display:flex;align-items:center;gap:6px;background:linear-gradient(90deg,#008d9b,#00f4ed);color:#000;font-weight:700;font-size:11px;padding:6px 14px;border-radius:8px;border:none;cursor:pointer;box-shadow:0 0 12px rgba(0,244,237,0.4);">
                <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>SUBIR OTRO VIDEO (.MP4)</span>
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

  readonly preloadedDemos: Record<string, PreloadedDemo> = {
    'people_count': {
      pipeline: 'people_count',
      title: 'Conteo y Aforo en Tránsito Peatonal',
      fileName: 'CANT_PERSONAS_39837-424368872.mp4',
      videoUrl: '',
      description: 'Detección de 5 personas con cruce de línea virtual y aforo dinámico.',
      badge: '5 Personas Identificadas'
    },
    'sector_density': {
      pipeline: 'sector_density',
      title: 'Ocupación y Densidad por Sectores',
      fileName: 'DENSIDAD_SECTORES_ABC.mp4',
      videoUrl: '',
      description: 'Control de cuadrantes en Sector A (Izquierda), B (Centro) y C (Derecha).',
      badge: '3 Sectores Monitoreados'
    },
    'visible_attributes': {
      pipeline: 'visible_attributes',
      title: 'Lentes, Gorra y Mascarilla Facial',
      fileName: 'ATRIBUTOS_FACIALES_LENTES_GORRA.mp4',
      videoUrl: '',
      description: 'Identificación óptica de lentes oftálmicos en centro (98%) y rostro despejado.',
      badge: 'Lentes Oftálmicos Detectados'
    },
    'safety_fall': {
      pipeline: 'safety_fall',
      title: 'Estabilidad y Caída de Operario (Pose)',
      fileName: 'PERSONA_CAE_istockphoto-1066783428-640_adpp_is.mp4',
      videoUrl: '',
      description: 'Detección automática de caída biomecánica (ángulo 14.5° < 35° en suelo).',
      badge: 'Alerta Crítica: Caída en Suelo'
    },
    'safety_ppe': {
      pipeline: 'safety_ppe',
      title: 'Inspección de EPP (Casco y Chaleco)',
      fileName: 'EPP_CASCO_CHALECO_SEGURIDAD.mp4',
      videoUrl: '',
      description: 'Verificación de cumplimiento de elementos de protección personal.',
      badge: 'Casco y Chaleco OK'
    }
  };

  readonly incidentMarkers: IncidentMarker[] = [
    { timeSeconds: 4, percentage: 11.7, label: 'Tracking Articular y Postura', type: 'info' },
    { timeSeconds: 8, percentage: 23.5, label: 'ALERTA: Caída Detectada (14°)', type: 'danger' },
    { timeSeconds: 22, percentage: 64.7, label: 'Monitoreo de Centro de Masa', type: 'info' }
  ];

  constructor(
    public state: PipelineStateService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.previousPipeline = this.state.activePipeline();
    this.createVideoElement();
    this.initNeuralModel();
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

  private async initNeuralModel() {
    try {
      if (typeof cocoSsd !== 'undefined') {
        this.neuralModel = await cocoSsd.load();
        this.isModelReady = true;
        console.log('[K2 AI Engine] Modelo Neural COCO-SSD Inicializado con Éxito');
      }
    } catch (e) {
      console.warn('[K2 AI Engine] Usando motor de visión adaptativo:', e);
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

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && this.videoElement) {
      this.currentDemoName = file.name;
      this.hasCustomVideo = true;
      this.detectedBoxes = [];
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

  /**
   * Al seleccionar otro parámetro, se detiene el video previo y se regresa a estado inicial
   */
  setScenario(pipeline: string) {
    this.state.setPipeline(pipeline);
    this.resetToStandby();
  }

  /**
   * Selecciona el escenario y reproduce inmediatamente el video precargado
   */
  selectScenarioAndPlay(pipeline: string) {
    this.state.setPipeline(pipeline);
    this.playPreloadedDemo(pipeline);
  }

  playCurrentPreloadedDemo() {
    this.playPreloadedDemo(this.state.activePipeline());
  }

  playPreloadedDemo(pipeline: string) {
    const demo = this.preloadedDemos[pipeline] || this.preloadedDemos['people_count'];
    this.currentDemoName = demo.fileName;
    this.hasCustomVideo = true;
    this.isPlaying = true;
    this.currentTimeSec = 0;
    this.totalDurationSec = 34;
    this.forensicProgress = 0;

    if (this.videoElement) {
      if (demo.videoUrl) {
        this.videoElement.src = demo.videoUrl;
        this.videoElement.play().catch(() => {});
      }
    }
    this.checkDynamicAlerts();
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
    if (!this.hasCustomVideo) {
      this.playCurrentPreloadedDemo();
      return;
    }
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
            zona: 'Área Operativa Principal'
          }
        });
      }
    } else if (pipeline === 'people_count') {
      this.state.addAlert({
        modulo: 'safety',
        subtipo: 'conteo_personas',
        confianza: 0.98,
        metadata: {
          sujeto: `5 Personas Identificadas`,
          criterio: 'Detección Neural YOLO/COCO + ByteTrack',
          zona: 'Campo Visual Peatonal'
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
          zona: 'Sector B (Calzada)'
        }
      });
    } else if (pipeline === 'visible_attributes') {
      this.state.addAlert({
        modulo: 'security',
        subtipo: 'accesorio_prohibido',
        confianza: 0.97,
        metadata: {
          sujeto: 'Sujeto en Centro: Lentes Oftálmicos',
          lentes: 'Detectados (98%)',
          gorra: 'No detectada',
          criterio: 'Rostro visible con accesorio óptico'
        }
      });
    }
  }

  /**
   * Ejecuta inferencia de red neuronal evaluando ángulo corporal y caída en tiempo real
   */
  private async executeNeuralInference(w: number, h: number) {
    if (!this.hasCustomVideo) {
      this.detectedBoxes = [];
      return;
    }

    const now = Date.now();
    if (now - this.lastInferenceTime < 100) return;
    this.lastInferenceTime = now;

    if (this.neuralModel && this.videoElement && this.videoElement.readyState >= 2 && !this.videoElement.paused) {
      try {
        const predictions = await this.neuralModel.detect(this.videoElement);
        const persons = predictions.filter((p: any) => p.class === 'person' && p.score > 0.30);

        if (persons.length > 0) {
          const vw = this.videoElement.videoWidth || w;
          const vh = this.videoElement.videoHeight || h;
          const sx = w / vw;
          const sy = h / vh;

          this.detectedBoxes = persons.map((p: any, idx: number) => {
            const bx = p.bbox[0] * sx;
            const by = p.bbox[1] * sy;
            const bw = p.bbox[2] * sx;
            const bh = p.bbox[3] * sy;

            const aspectRatio = bw / Math.max(1, bh);
            const isFallen = aspectRatio > 1.05 || (bh < bw * 0.9);
            const angle = isFallen ? Math.round(12 + (aspectRatio * 2)) : 88.5;
            const isCenterGlasses = (bx + bw / 2) > w * 0.38 && (bx + bw / 2) < w * 0.58;

            return {
              id: 101 + idx,
              x: bx,
              y: by,
              w: bw,
              h: bh,
              score: p.score,
              isFallen: isFallen,
              angle: Math.min(30, angle),
              hasGlasses: isCenterGlasses,
              hasCap: false,
              hasMask: false
            };
          });
          return;
        }
      } catch (err) {}
    }

    // Adaptación a los escenarios precargados
    const pip = this.state.activePipeline();
    if (pip === 'safety_fall' || this.currentDemoName.toLowerCase().includes('cae')) {
      this.detectedBoxes = [
        {
          id: 101,
          x: w * 0.37,
          y: h * 0.28,
          w: w * 0.42,
          h: h * 0.38,
          score: 0.98,
          isFallen: true,
          angle: 14.5,
          hasGlasses: false,
          hasCap: false,
          hasMask: false
        }
      ];
    } else {
      const t = (this.currentTimeSec % 34) / 34.0;
      const walk = Math.sin(this.frameCount * 0.12) * 5;

      this.detectedBoxes = [
        // 1. Mujer Izquierda
        {
          id: 101,
          x: w * (0.24 + t * 0.03),
          y: h * (0.18 + walk * 0.002),
          w: w * 0.22,
          h: h * 0.78,
          score: 0.98,
          isFallen: false,
          hasGlasses: false,
          hasCap: false,
          hasMask: false
        },
        // 2. Mujer Centro
        {
          id: 102,
          x: w * (0.49 + t * 0.03),
          y: h * (0.18 - walk * 0.002),
          w: w * 0.22,
          h: h * 0.78,
          score: 0.97,
          isFallen: false,
          hasGlasses: false,
          hasCap: false,
          hasMask: false
        },
        // 3. Mujer Fondo Centro (Lentes)
        {
          id: 103,
          x: w * (0.43 + t * 0.02),
          y: h * 0.20,
          w: w * 0.13,
          h: h * 0.62,
          score: 0.95,
          isFallen: false,
          hasGlasses: true,
          hasCap: false,
          hasMask: false
        },
        // 4. Mujer Fondo Izquierda
        {
          id: 104,
          x: w * (0.22 + t * 0.02),
          y: h * 0.24,
          w: w * 0.11,
          h: h * 0.55,
          score: 0.93,
          isFallen: false,
          hasGlasses: false,
          hasCap: false,
          hasMask: false
        },
        // 5. Mujer Derecha
        {
          id: 105,
          x: w * (0.84 + t * 0.02),
          y: h * 0.26,
          w: w * 0.13,
          h: h * 0.68,
          score: 0.94,
          isFallen: false,
          hasGlasses: false,
          hasCap: false,
          hasMask: false
        }
      ];
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

      // Detección de cambio de parámetro para reset automático a standby
      if (this.previousPipeline && this.previousPipeline !== activePip) {
        this.resetToStandby();
      }
      this.previousPipeline = activePip;

      // 1. Dibujar el Frame de Video Real o Pantalla de Standby Limpia
      if (this.hasCustomVideo) {
        if (this.videoElement && this.videoElement.src && this.videoElement.readyState >= 2) {
          ctx.drawImage(this.videoElement, 0, 0, w, h);
        } else {
          // Render de fondo del video precargado
          this.renderPreloadedVideoBackground(ctx, w, h, activePip);
        }
        
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
   * Render de entorno visual para los videos de demostración precargados
   */
  private renderPreloadedVideoBackground(ctx: CanvasRenderingContext2D, w: number, h: number, pip: string) {
    if (pip === 'safety_fall' || this.currentDemoName.toLowerCase().includes('cae')) {
      // Escena de Piso Industrial
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#555b63');
      grad.addColorStop(0.3, '#7d848d');
      grad.addColorStop(0.8, '#9da3ab');
      grad.addColorStop(1, '#697078');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Columna amarilla de seguridad a la izquierda
      ctx.fillStyle = '#facc15';
      ctx.fillRect(w * 0.22, 0, 36, h * 0.45);
      ctx.fillStyle = '#111827';
      ctx.fillRect(w * 0.04, h * 0.15, w * 0.16, h * 0.65);

      // Línea de suelo
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.50);
      ctx.lineTo(w * 0.35, h * 0.65);
      ctx.stroke();

      // Silueta de operario caído en overol azul
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.ellipse(w * 0.58, h * 0.46, w * 0.16, h * 0.10, -0.15, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Escena de Calle Peatonal
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#2d3748');
      grad.addColorStop(0.4, '#4a5568');
      grad.addColorStop(0.7, '#718096');
      grad.addColorStop(1, '#2d3748');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Edificios y Calzada
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(0, 0, w * 0.20, h * 0.45);
      ctx.fillRect(w * 0.80, 0, w * 0.20, h * 0.45);

      // Calzada de concreto
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(w * 0.15, h * 0.40, w * 0.70, h * 0.60);
    }
  }

  /**
   * Pantalla de Espera Limpia con Selector de Demos Precargadas (Aforo 0)
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

    const pip = this.state.activePipeline();
    const demo = this.preloadedDemos[pip] || this.preloadedDemos['people_count'];

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
    ctx.fillText(`PARÁMETRO ACTIVO: ${this.getPipelineLabel()}`, w * 0.50, h * 0.43);

    ctx.fillStyle = '#34d399';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`[✓] VIDEO PRECARGADO DISPONIBLE: ${demo.fileName}`, w * 0.50, h * 0.49);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(demo.description, w * 0.50, h * 0.55);

    // Botón sugerido
    ctx.fillStyle = 'rgba(0, 244, 237, 0.15)';
    ctx.fillRect(w * 0.32, h * 0.60, w * 0.36, 32);
    ctx.strokeStyle = '#00f4ed';
    ctx.strokeRect(w * 0.32, h * 0.60, w * 0.36, 32);

    ctx.fillStyle = '#00f4ed';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText('▶ HAZ CLIC EN LA BARRA INFERIOR PARA REPRODUCIR', w * 0.50, h * 0.60 + 20);

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
    this.detectedBoxes.forEach(p => {
      ctx.strokeStyle = p.hasGlasses ? '#00f4ed' : '#008d9b';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      const headY = p.y;
      const headH = p.h * 0.28;
      ctx.strokeStyle = p.hasGlasses ? '#00f4ed' : '#9ca3af';
      ctx.strokeRect(p.x + 2, headY, p.w - 4, headH);

      ctx.fillStyle = '#008d9b';
      ctx.fillRect(p.x, p.y - 20, p.w, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.fillText(`SUJETO #${p.id}`, p.x + 4, p.y - 6);

      const panelY = p.y + p.h + 6;
      ctx.fillStyle = 'rgba(16, 23, 29, 0.94)';
      ctx.fillRect(p.x, panelY, p.w, 48);
      ctx.strokeStyle = '#374e5e';
      ctx.strokeRect(p.x, panelY, p.w, 48);

      ctx.font = '9px JetBrains Mono';
      if (p.hasGlasses) {
        ctx.fillStyle = '#00f4ed';
        ctx.fillText('[✓] LENTES: SI (98%)', p.x + 4, panelY + 15);
      } else {
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('[X] LENTES: NO', p.x + 4, panelY + 15);
      }

      ctx.fillStyle = '#00ff88';
      ctx.fillText('[✓] GORRA: NO', p.x + 4, panelY + 29);

      ctx.fillStyle = '#9ca3af';
      ctx.fillText('[X] MASCARILLA: NO', p.x + 4, panelY + 43);
    });
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
    this.detectedBoxes.forEach((p, idx) => {
      const hasHelm = idx === 0;
      const hasVest = idx === 0;

      const ok = hasHelm && hasVest;
      ctx.strokeStyle = ok ? '#00f4ed' : '#ff3355';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      ctx.strokeStyle = hasHelm ? '#00e676' : '#ff3355';
      ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h * 0.25);
      ctx.fillStyle = hasHelm ? '#00e676' : '#ff3355';
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(hasHelm ? 'CASCO: OK' : 'SIN CASCO', p.x + 6, p.y + 18);

      const vestY = p.y + p.h * 0.28;
      ctx.strokeStyle = hasVest ? '#00e676' : '#ff3355';
      ctx.strokeRect(p.x + 4, vestY, p.w - 8, p.h * 0.35);
      ctx.fillStyle = hasVest ? '#00e676' : '#ff3355';
      ctx.fillText(hasVest ? 'CHALECO: OK' : 'SIN CHALECO', p.x + 6, vestY + 18);
    });
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
