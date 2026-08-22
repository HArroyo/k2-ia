<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database strictly with QueryBuilder.
     */
    public function run(): void
    {
        // 1. Sembrar Personas de Resguardo (Whitelist / Blacklist)
        DB::table('personas_resguardo')->truncate();
        DB::table('personas_resguardo')->insert([
            [
                'nombre' => 'Roberto Alva Ramírez',
                'documento' => '45871234',
                'tipo_lista' => 'whitelist',
                'embedding_facial' => json_encode(array_fill(0, 512, 0.05)),
                'foto_referencia' => '/storage/referencias/roberto_alva.jpg',
                'motivo_bloqueo' => null,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Elena Vásquez Torres',
                'documento' => '71294821',
                'tipo_lista' => 'whitelist',
                'embedding_facial' => json_encode(array_fill(0, 512, 0.03)),
                'foto_referencia' => '/storage/referencias/elena_vasquez.jpg',
                'motivo_bloqueo' => null,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Manuel "Gordo" Ríos',
                'documento' => '09823411',
                'tipo_lista' => 'blacklist',
                'embedding_facial' => json_encode(array_fill(0, 512, -0.04)),
                'foto_referencia' => '/storage/referencias/manuel_rios.jpg',
                'motivo_bloqueo' => 'Orden de captura vigente por sustracción de bienes y hurto agravado',
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Javier Quintana Paredes',
                'documento' => '40192834',
                'tipo_lista' => 'blacklist',
                'embedding_facial' => json_encode(array_fill(0, 512, -0.02)),
                'foto_referencia' => '/storage/referencias/javier_quintana.jpg',
                'motivo_bloqueo' => 'Ex-colaborador cesado con medidas cautelares de restricción de acercamiento',
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // 2. Sembrar Vehículos de Resguardo
        DB::table('vehiculos_resguardo')->truncate();
        DB::table('vehiculos_resguardo')->insert([
            [
                'placa' => 'ABC-123',
                'tipo_lista' => 'whitelist',
                'propietario' => 'Ing. Carlos Mendoza (Gerente Operaciones)',
                'modelo_color' => 'Toyota Hilux - Gris Metálico',
                'motivo_bloqueo' => null,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'placa' => 'K2S-888',
                'tipo_lista' => 'whitelist',
                'propietario' => 'Patrulla K2 Seguridad y Resguardo',
                'modelo_color' => 'Ford Ranger - Negro y Turquesa',
                'motivo_bloqueo' => null,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'placa' => 'XYZ-999',
                'tipo_lista' => 'blacklist',
                'propietario' => 'Vehículo Sospechoso - Denuncia de Asalto',
                'modelo_color' => 'Hyundai Accent - Negro Polarizado',
                'motivo_bloqueo' => 'Placa vinculada a banda delictiva en parque industrial',
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'placa' => 'BLK-666',
                'tipo_lista' => 'blacklist',
                'propietario' => 'Empresa Ficticia Carga SAC',
                'modelo_color' => 'Camión Fuso - Blanco/Rojo',
                'motivo_bloqueo' => 'Bloqueado por disposición judicial y aduanera',
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // 3. Sembrar Zonas de Monitoreo ROI
        DB::table('zonas_monitoreo')->truncate();
        DB::table('zonas_monitoreo')->insert([
            [
                'nombre' => 'Zona Restringida Maquinaria Pesada',
                'codigo' => 'ROI-MAQ-01',
                'poligono_roi' => json_encode([
                    [576, 288],
                    [1152, 288],
                    [1088, 633],
                    [512, 633],
                ]),
                'regla_activa' => 'prohibido_ingreso',
                'tiempo_maximo_segundos' => 0,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre' => 'Bahía de Carga y Descarga de Combustible',
                'codigo' => 'ROI-COMB-02',
                'poligono_roi' => json_encode([
                    [200, 300],
                    [600, 300],
                    [550, 600],
                    [150, 600],
                ]),
                'regla_activa' => 'permanencia_maxima',
                'tiempo_maximo_segundos' => 300,
                'activo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // 4. Sembrar Eventos Iniciales de Muestra
        DB::table('eventos_analitica')->truncate();
        DB::table('eventos_analitica')->insert([
            [
                'modulo' => 'safety',
                'subtipo' => 'sin_casco',
                'snapshot_path' => '/snapshots/demo_sin_casco.jpg',
                'confianza' => 0.95,
                'coordenadas_json' => json_encode(['x' => 832, 'y' => 273, 'w' => 130, 'h' => 300]),
                'metadata_json' => json_encode([
                    'sujeto' => 'Operador #102',
                    'faltante' => 'Casco',
                    'zona' => 'Área de Carga y Descarga',
                    'nivel_riesgo' => 'ALTO'
                ]),
                'created_at' => now()->subMinutes(12),
                'updated_at' => now()->subMinutes(12),
            ],
            [
                'modulo' => 'security',
                'subtipo' => 'placa_blacklist',
                'snapshot_path' => '/snapshots/demo_placa_blacklist.jpg',
                'confianza' => 0.98,
                'coordenadas_json' => json_encode(['x' => 450, 'y' => 520, 'w' => 140, 'h' => 48]),
                'metadata_json' => json_encode([
                    'placa' => 'XYZ-999',
                    'tipo_lista' => 'blacklist',
                    'propietario' => 'Vehículo Sospechoso - Denuncia de Asalto',
                    'carril' => 'Acceso Principal Norte'
                ]),
                'created_at' => now()->subMinutes(6),
                'updated_at' => now()->subMinutes(6),
            ],
            [
                'modulo' => 'safety',
                'subtipo' => 'caida',
                'snapshot_path' => '/snapshots/demo_caida.jpg',
                'confianza' => 0.96,
                'coordenadas_json' => json_encode(['x' => 712, 'y' => 478, 'w' => 240, 'h' => 90]),
                'metadata_json' => json_encode([
                    'sujeto' => 'Operario B',
                    'angulo_torso' => 18.0,
                    'criterio' => 'Vector torso-suelo < 35° con inactividad',
                    'prioridad' => 'CRITICA'
                ]),
                'created_at' => now()->subMinutes(2),
                'updated_at' => now()->subMinutes(2),
            ],
        ]);
    }
}
