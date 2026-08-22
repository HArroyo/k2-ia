import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PipelineStateService } from '../../services/pipeline-state.service';

@Component({
  selector: 'app-metrics-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="h-20 bg-k2-card/95 border-t border-k2-border flex items-center justify-between px-6 select-none">
      
      <!-- Indicador de Turno -->
      <div class="flex items-center space-x-3 pr-6 border-r border-k2-border/60">
        <div class="w-8 h-8 rounded-lg bg-k2-darkblue flex items-center justify-center border border-k2-teal/40">
          <svg class="w-4 h-4 text-k2-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">MÉTRICAS DEL TURNO</span>
          <span class="text-xs font-mono font-bold text-white">GUARDIA ACTIVA • HOY</span>
        </div>
      </div>

      <!-- Cuadrícula de KPIs Rápidos -->
      <div class="flex-1 grid grid-cols-4 gap-4 px-6">
        
        <!-- KPI 1: Total Detecciones -->
        <div class="bg-k2-darkblue/80 rounded-xl p-2.5 border border-gray-700/60 flex items-center justify-between shadow-sm">
          <div>
            <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL DETECCIONES</span>
            <span class="text-xl font-extrabold text-white font-mono leading-none mt-1 block">
              {{ state.metrics().total_detecciones | number }}
            </span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-teal-950/60 text-k2-accent flex items-center justify-center border border-k2-accent/30">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        <!-- KPI 2: Infracciones EPP -->
        <div class="bg-k2-darkblue/80 rounded-xl p-2.5 border border-yellow-500/30 flex items-center justify-between shadow-sm">
          <div>
            <span class="text-[10px] text-yellow-400 font-bold uppercase tracking-wider block">INFRACCIONES EPP</span>
            <span class="text-xl font-extrabold text-yellow-300 font-mono leading-none mt-1 block">
              {{ state.metrics().infracciones_epp | number }}
            </span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-yellow-950/60 text-yellow-400 flex items-center justify-center border border-yellow-500/40">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        <!-- KPI 3: Alertas Blacklist -->
        <div class="bg-k2-darkblue/80 rounded-xl p-2.5 border border-red-500/40 flex items-center justify-between shadow-sm">
          <div>
            <span class="text-[10px] text-red-400 font-bold uppercase tracking-wider block">ALERTAS BLACKLIST</span>
            <span class="text-xl font-extrabold text-red-400 font-mono leading-none mt-1 block">
              {{ state.metrics().alertas_blacklist | number }}
            </span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-red-950/60 text-red-400 flex items-center justify-center border border-red-500/40">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>

        <!-- KPI 4: Caídas Registradas -->
        <div class="bg-k2-darkblue/80 rounded-xl p-2.5 border border-orange-500/30 flex items-center justify-between shadow-sm">
          <div>
            <span class="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">CAÍDAS REGISTRADAS</span>
            <span class="text-xl font-extrabold text-orange-300 font-mono leading-none mt-1 block">
              {{ state.metrics().caidas_registradas | number }}
            </span>
          </div>
          <div class="w-8 h-8 rounded-lg bg-orange-950/60 text-orange-400 flex items-center justify-center border border-orange-500/40">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

      </div>

      <!-- Estado Conexión QueryBuilder DB -->
      <div class="pl-6 border-l border-k2-border/60 flex items-center space-x-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <div class="flex flex-col">
          <span class="text-[9px] text-gray-400 font-mono uppercase">PERSISTENCIA DB</span>
          <span class="text-[11px] text-emerald-400 font-mono font-bold">QueryBuilder OK</span>
        </div>
      </div>

    </footer>
  `
})
export class MetricsBarComponent {
  constructor(public state: PipelineStateService) {}
}
