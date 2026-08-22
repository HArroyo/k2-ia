<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class VehiculoResguardoController extends Controller
{
    /**
     * Listar vehículos registrados (QueryBuilder).
     */
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('vehiculos_resguardo');

        if ($request->has('tipo_lista') && !empty($request->input('tipo_lista'))) {
            $query->where('tipo_lista', $request->input('tipo_lista'));
        }

        if ($request->has('placa') && !empty($request->input('placa'))) {
            $query->where('placa', 'like', '%' . $request->input('placa') . '%');
        }

        $vehiculos = $query->orderBy('placa', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $vehiculos
        ]);
    }

    /**
     * Consultar placa específica (Cruce LPR) (QueryBuilder).
     */
    public function consultarPlaca(string $placa): JsonResponse
    {
        $vehiculo = DB::table('vehiculos_resguardo')
            ->where('placa', strtoupper(trim($placa)))
            ->first();

        if (!$vehiculo) {
            return response()->json([
                'status' => 'not_found',
                'tipo_lista' => 'no_registrado',
                'mensaje' => 'Placa no registrada en la base de datos de resguardo'
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data' => $vehiculo
        ]);
    }

    /**
     * Registrar vehículo (QueryBuilder).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'placa' => 'required|string',
            'tipo_lista' => 'required|in:whitelist,blacklist',
            'propietario' => 'required|string',
        ]);

        $id = DB::table('vehiculos_resguardo')->insertGetId([
            'placa' => strtoupper(trim($request->input('placa'))),
            'tipo_lista' => $request->input('tipo_lista'),
            'propietario' => $request->input('propietario'),
            'modelo_color' => $request->input('modelo_color'),
            'motivo_bloqueo' => $request->input('motivo_bloqueo'),
            'activo' => $request->input('activo', true),
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json([
            'status' => 'success',
            'id' => $id,
            'message' => 'Vehículo registrado exitosamente con QueryBuilder'
        ], 201);
    }
}
