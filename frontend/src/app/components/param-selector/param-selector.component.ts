import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PipelineStateService } from '../../services/pipeline-state.service';

interface PipelineOption {
  id: string;
  name: string;
  category: 'safety' | 'security';
  icon: string;
  description: string;
  model: string;
  badgeColor: string;
  priority?: boolean;
}

@Component({
  selector: 'app-param-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="w-full h-full bg-k2-card/95 border-r border-k2-border flex flex-col overflow-y-auto select-none">
      <!-- Título de Sección -->
      <div class="p-4 border-b border-k2-border/60">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold text-gray-300 tracking-wider uppercase flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-k2-accent animate-ping"></span>
            <span>PARAMETRIZACIÓN ACTIVA</span>
          </h2>
          <span class="text-[10px] font-mono bg-k2-darkblue text-k2-accent px-2 py-0.5 rounded border border-k2-teal/30">
            SINGLE-PIPELINE
          </span>
        </div>
        <p class="text-[11px] text-gray-400 mt-1">Selecciona el módulo de análisis para optimizar la GPU.</p>
      </div>

      <div class="p-3 space-y-5 flex-1">
        <!-- SECCIÓN 1: SEGURIDAD OCUPACIONAL & CONTROL DE FLUJO (SAFETY) -->
        <div>
          <div class="flex items-center space-x-2 px-2 mb-2">
            <svg class="w-4 h-4 text-k2-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span class="text-xs font-bold text-k2-accent tracking-wider uppercase">MÓDULO 1: SAFETY & AFORO</span>
          </div>

          <div class="space-y-1.5">
            @for (opt of safetyOptions; track opt.id) {
              <button
                (click)="state.setPipeline(opt.id)"
                [class]="state.activePipeline() === opt.id 
                  ? 'bg-k2-darkblue border-k2-accent glow-accent' 
                  : 'bg-k2-card hover:bg-k2-border/40 border-transparent text-gray-300'"
                class="w-full text-left p-3 rounded-xl border transition-all duration-200 group relative">
                
                <div class="flex items-start justify-between">
                  <div class="flex items-center space-x-2.5">
                    <div [class]="state.activePipeline() === opt.id ? 'text-k2-accent' : 'text-gray-400 group-hover:text-white'">
                      <span [innerHTML]="opt.icon"></span>
                    </div>
                    <div>
                      <div class="flex items-center space-x-1.5">
                        <h4 class="text-xs font-bold" [class]="state.activePipeline() === opt.id ? 'text-white' : 'text-gray-200'">
                          {{ opt.name }}
                        </h4>
                      </div>
                      <p class="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{{ opt.description }}</p>
                    </div>
                  </div>

                  @if (state.activePipeline() === opt.id) {
                    <span class="flex h-2 w-2 relative mt-1">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-k2-accent opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-k2-accent"></span>
                    </span>
                  }
                </div>

                <div class="mt-2 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-700/40 pt-1.5">
                  <span class="font-mono">{{ opt.model }}</span>
                  <span class="font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                        [class]="state.activePipeline() === opt.id ? 'bg-k2-teal/30 text-k2-accent border border-k2-accent/30' : 'bg-gray-800 text-gray-400'">
                    {{ state.activePipeline() === opt.id ? 'ACTIVO' : 'DISPONIBLE' }}
                  </span>
                </div>
              </button>
            }
          </div>
        </div>

        <!-- SECCIÓN 2: SEGURIDAD PATRIMONIAL & CARACTERÍSTICAS (SECURITY) -->
        <div>
          <div class="flex items-center space-x-2 px-2 mb-2">
            <svg class="w-4 h-4 text-k2-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span class="text-xs font-bold text-k2-accent tracking-wider uppercase">MÓDULO 2: SECURITY & ATRIBUTOS</span>
          </div>

          <div class="space-y-1.5">
            @for (opt of securityOptions; track opt.id) {
              <button
                (click)="state.setPipeline(opt.id)"
                [class]="state.activePipeline() === opt.id 
                  ? 'bg-k2-darkblue border-k2-accent glow-accent' 
                  : 'bg-k2-card hover:bg-k2-border/40 border-transparent text-gray-300'"
                class="w-full text-left p-3 rounded-xl border transition-all duration-200 group relative">
                
                <div class="flex items-start justify-between">
                  <div class="flex items-center space-x-2.5">
                    <div [class]="state.activePipeline() === opt.id ? 'text-k2-accent' : 'text-gray-400 group-hover:text-white'">
                      <span [innerHTML]="opt.icon"></span>
                    </div>
                    <div>
                      <h4 class="text-xs font-bold" [class]="state.activePipeline() === opt.id ? 'text-white' : 'text-gray-200'">
                        {{ opt.name }}
                      </h4>
                      <p class="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{{ opt.description }}</p>
                    </div>
                  </div>

                  @if (state.activePipeline() === opt.id) {
                    <span class="flex h-2 w-2 relative mt-1">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-k2-accent opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-k2-accent"></span>
                    </span>
                  }
                </div>

                <div class="mt-2 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-700/40 pt-1.5">
                  <span class="font-mono">{{ opt.model }}</span>
                  <span class="font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                        [class]="state.activePipeline() === opt.id ? 'bg-k2-teal/30 text-k2-accent border border-k2-accent/30' : 'bg-gray-800 text-gray-400'">
                    {{ state.activePipeline() === opt.id ? 'ACTIVO' : 'DISPONIBLE' }}
                  </span>
                </div>
              </button>
            }
          </div>
        </div>
      </div>
    </aside>
  `
})
export class ParamSelectorComponent {
  constructor(public state: PipelineStateService) {}

  readonly safetyOptions: PipelineOption[] = [
    {
      id: 'people_count',
      name: 'Detección y Conteo de Personas',
      category: 'safety',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
      description: 'Aforo en tiempo real, conteo bidireccional y tracking',
      model: 'YOLOv11 Person + ByteTrack',
      badgeColor: 'border-k2-accent text-k2-accent'
    },
    {
      id: 'sector_density',
      name: 'Ocupación y Densidad por Sectores',
      category: 'safety',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>',
      description: 'Límite de capacidad y mapa de densidad por áreas',
      model: 'Sector Polygon Heatmap',
      badgeColor: 'border-yellow-500 text-yellow-400'
    },
    {
      id: 'safety_ppe',
      name: 'Casco y Chaleco (EPP)',
      category: 'safety',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>',
      description: 'Detección tercio superior/medio de indumentaria',
      model: 'YOLOv11x EPP',
      badgeColor: 'border-yellow-500 text-yellow-400'
    },
    {
      id: 'safety_roi',
      name: 'Permanencia en Área (ROI)',
      category: 'safety',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>',
      description: 'Tracking ByteTrack y pointPolygonTest',
      model: 'ByteTrack + ROI Test',
      badgeColor: 'border-orange-500 text-orange-400'
    },
    {
      id: 'safety_fall',
      name: 'Estabilidad y Caídas',
      category: 'safety',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
      description: 'Ángulo torso-suelo < 35° y cambio brusco Y',
      model: 'YOLOv8-Pose Articular',
      badgeColor: 'border-red-500 text-red-400'
    }
  ];

  readonly securityOptions: PipelineOption[] = [
    {
      id: 'visible_attributes',
      name: 'Lentes, Gorra y Mascarilla',
      category: 'security',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>',
      description: 'Identificación de accesorios faciales y de seguridad',
      model: 'Head-Crop MultiLabel Classifier',
      badgeColor: 'border-k2-accent text-k2-accent'
    },
    {
      id: 'security_lpr',
      name: 'Identificación Placas (LPR)',
      category: 'security',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>',
      description: 'YOLO Placas + Fast-Plate-OCR vs DB',
      model: 'YOLO + PaddleOCR',
      badgeColor: 'border-cyan-500 text-cyan-400'
    },
    {
      id: 'security_face',
      name: 'Reconocimiento Facial',
      category: 'security',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
      description: 'ArcFace 512d & Similitud Coseno Listas',
      model: 'RetinaFace + ArcFace',
      badgeColor: 'border-purple-500 text-purple-400'
    }
  ];
}
