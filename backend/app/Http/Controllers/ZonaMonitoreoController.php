<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class ZonaMonitoreoController extends Controller
{
    /**
     * Listar zonas ROI configuradas (QueryBuilder).
     */
    public function index(): JsonResponse
    {
        $zonas = DB::table('zonas_monitoreo')->where('activo', true)->get();

        $resultado = $zonas->map(function ($z) {
            return [
                'id' => $z->id,
                'nombre' => $z->nombre,
                'codigo' => $z->codigo,
                'poligono_roi' => json_decode($z->poligono_roi, true),
                'regla_activa' => $z->regla_activa,
                'tiempo_maximo_segundos' => $z->tiempo_maximo_segundos,
                'activo' => (bool)$z->activo,
                'created_at' => $z->created_at,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $resultado
        ]);
    }

    /**
     * Guardar o actualizar polígono ROI (QueryBuilder).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nombre' => 'required|string',
            'codigo' => 'required|string',
            'poligono_roi' => 'required|array',
        ]);

        $id = DB::table('zonas_monitoreo')->updateOrInsert(
            ['codigo' => $request->input('codigo')],
            [
                'nombre' => $request->input('nombre'),
                'poligono_roi' => json_encode($request->input('poligono_roi')),
                'regla_activa' => $request->input('regla_activa', 'prohibido_ingreso'),
                'tiempo_maximo_segundos' => (int)$request->input('tiempo_maximo_segundos', 0),
                'activo' => true,
                'updated_at' => now(),
                'created_at' => now()
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Zona ROI guardada con éxito usando QueryBuilder'
        ]);
    }
}
