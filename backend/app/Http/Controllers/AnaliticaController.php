<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class AnaliticaController extends Controller
{
    /**
     * Listar eventos de analítica con filtros (QueryBuilder Estricto).
     */
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('eventos_analitica')->orderBy('id', 'desc');

        if ($request->has('modulo') && !empty($request->input('modulo'))) {
            $query->where('modulo', $request->input('modulo'));
        }

        if ($request->has('subtipo') && !empty($request->input('subtipo'))) {
            $query->where('subtipo', $request->input('subtipo'));
        }

        if ($request->has('limite')) {
            $limit = min((int)$request->input('limite', 50), 200);
            $eventos = $query->limit($limit)->get();
        } else {
            $eventos = $query->limit(50)->get();
        }

        // Decodificar JSONs para el cliente
        $resultado = $eventos->map(function ($ev) {
            return [
                'id' => $ev->id,
                'modulo' => $ev->modulo,
                'subtipo' => $ev->subtipo,
                'snapshot_path' => $ev->snapshot_path,
                'confianza' => (float)$ev->confianza,
                'coordenadas' => json_decode($ev->coordenadas_json, true),
                'metadata' => json_decode($ev->metadata_json, true),
                'created_at' => $ev->created_at,
            ];
        });

        return response()->json([
            'status' => 'success',
            'total' => $resultado->count(),
            'data' => $resultado
        ]);
    }

    /**
     * Registrar nuevo evento de analítica emitido por el motor IA (QueryBuilder Estricto).
     */
    public function store(Request $request): JsonResponse
    {
        $modulo = $request->input('modulo', 'safety');
        $subtipo = $request->input('subtipo', 'general');
        $snapshotPath = $request->input('snapshot_path', '');
        $confianza = $request->input('confianza', $request->input('confidence', 0.90));
        
        $coordenadas = $request->input('coordenadas_json', $request->input('coordenadas', []));
        $metadata = $request->input('metadata_json', $request->input('metadata', []));

        $id = DB::table('eventos_analitica')->insertGetId([
            'modulo' => $modulo,
            'subtipo' => $subtipo,
            'snapshot_path' => $snapshotPath,
            'confianza' => $confianza,
            'coordenadas_json' => is_string($coordenadas) ? $coordenadas : json_encode($coordenadas),
            'metadata_json' => is_string($metadata) ? $metadata : json_encode($metadata),
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Evento persistido exitosamente con QueryBuilder',
            'id' => $id
        ], 201);
    }

    /**
     * Ver detalle de un evento por ID (QueryBuilder Estricto).
     */
    public function show(int $id): JsonResponse
    {
        $ev = DB::table('eventos_analitica')->where('id', $id)->first();

        if (!$ev) {
            return response()->json(['status' => 'error', 'message' => 'Evento no encontrado'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $ev->id,
                'modulo' => $ev->modulo,
                'subtipo' => $ev->subtipo,
                'snapshot_path' => $ev->snapshot_path,
                'confianza' => (float)$ev->confianza,
                'coordenadas' => json_decode($ev->coordenadas_json, true),
                'metadata' => json_decode($ev->metadata_json, true),
                'created_at' => $ev->created_at,
                'updated_at' => $ev->updated_at,
            ]
        ]);
    }

    /**
     * Métricas rápidas del turno para el dashboard K2 (QueryBuilder Estricto).
     */
    public function metricas(): JsonResponse
    {
        $hoy = now()->startOfDay();

        // 1. Total Detecciones
        $totalDetecciones = DB::table('eventos_analitica')
            ->where('created_at', '>=', $hoy)
            ->count();

        // 2. Infracciones EPP (Sin Casco, Sin Chaleco, Sin EPP)
        $infraccionesEPP = DB::table('eventos_analitica')
            ->where('created_at', '>=', $hoy)
            ->whereIn('subtipo', ['sin_casco', 'sin_chaleco', 'sin_epp_completo'])
            ->count();

        // 3. Alertas Blacklist (Rostros Blacklist y Placas Blacklist)
        $alertasBlacklist = DB::table('eventos_analitica')
            ->where('created_at', '>=', $hoy)
            ->whereIn('subtipo', ['placa_blacklist', 'rostro_blacklist'])
            ->count();

        // 4. Caídas Registradas
        $caidasRegistradas = DB::table('eventos_analitica')
            ->where('created_at', '>=', $hoy)
            ->where('subtipo', 'caida')
            ->count();

        // 5. Invasiones de Zona ROI
        $invasionesZona = DB::table('eventos_analitica')
            ->where('created_at', '>=', $hoy)
            ->whereIn('subtipo', ['invasion_zona', 'permanencia_excedida'])
            ->count();

        // 6. Distribución por módulo
        $porModulo = DB::table('eventos_analitica')
            ->where('created_at', '>=', $hoy)
            ->select('modulo', DB::raw('count(*) as total'))
            ->groupBy('modulo')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_detecciones' => $totalDetecciones,
                'infracciones_epp' => $infraccionesEPP,
                'alertas_blacklist' => $alertasBlacklist,
                'caidas_registradas' => $caidasRegistradas,
                'invasiones_zona' => $invasionesZona,
                'por_modulo' => $porModulo,
                'fecha_corte' => now()->toIso8601String()
            ]
        ]);
    }
}
