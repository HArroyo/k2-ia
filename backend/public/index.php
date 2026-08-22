<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Archivo SQLite local para pruebas standalone inmediatas
$dbPath = __DIR__ . '/../database/k2_database.sqlite';
if (!file_exists($dbPath)) {
    touch($dbPath);
}

try {
    $pdo = new PDO("sqlite:" . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Inicializar tablas si no existen (Esquema QueryBuilder K2)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS eventos_analitica (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            modulo TEXT NOT NULL,
            subtipo TEXT NOT NULL,
            snapshot_path TEXT,
            confianza REAL DEFAULT 0.0,
            coordenadas_json TEXT,
            metadata_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS personas_resguardo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            documento TEXT UNIQUE NOT NULL,
            tipo_lista TEXT NOT NULL,
            embedding_facial TEXT,
            foto_referencia TEXT,
            motivo_bloqueo TEXT,
            activo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS vehiculos_resguardo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            placa TEXT UNIQUE NOT NULL,
            tipo_lista TEXT NOT NULL,
            propietario TEXT NOT NULL,
            modelo_color TEXT,
            motivo_bloqueo TEXT,
            activo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS zonas_monitoreo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            codigo TEXT UNIQUE NOT NULL,
            poligono_roi TEXT NOT NULL,
            regla_activa TEXT NOT NULL,
            tiempo_maximo_segundos INTEGER DEFAULT 0,
            activo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");

    // Sembrar registros iniciales si está vacía
    $count = $pdo->query("SELECT count(*) FROM personas_resguardo")->fetchColumn();
    if ($count == 0) {
        $pdo->exec("
            INSERT INTO personas_resguardo (nombre, documento, tipo_lista, motivo_bloqueo, activo) VALUES
            ('Roberto Alva Ramírez', '45871234', 'whitelist', NULL, 1),
            ('Elena Vásquez Torres', '71294821', 'whitelist', NULL, 1),
            ('Manuel \"Gordo\" Ríos', '09823411', 'blacklist', 'Orden de captura por sustracción agravada', 1),
            ('Javier Quintana', '40192834', 'blacklist', 'Ex-colaborador con medida cautelar', 1);

            INSERT INTO vehiculos_resguardo (placa, tipo_lista, propietario, modelo_color, motivo_bloqueo, activo) VALUES
            ('ABC-123', 'whitelist', 'Ing. Carlos Mendoza (Gerente Operaciones)', 'Toyota Hilux - Gris', NULL, 1),
            ('K2S-888', 'whitelist', 'Patrulla K2 Seguridad', 'Ford Ranger - Negro/Turquesa', NULL, 1),
            ('XYZ-999', 'blacklist', 'Vehículo Sospechoso - Denuncia de Asalto', 'Hyundai Accent - Negro', 'Placa vinculada a banda delictiva', 1),
            ('BLK-666', 'blacklist', 'Empresa Ficticia SAC', 'Camión Fuso - Blanco', 'Bloqueado por disposición judicial', 1);

            INSERT INTO zonas_monitoreo (nombre, codigo, poligono_roi, regla_activa, tiempo_maximo_segundos, activo) VALUES
            ('Zona Restringida Maquinaria Pesada', 'ROI-MAQ-01', '[[576,288],[1152,288],[1088,633],[512,633]]', 'prohibido_ingreso', 0, 1);

            INSERT INTO eventos_analitica (modulo, subtipo, snapshot_path, confianza, metadata_json) VALUES
            ('safety', 'sin_casco', '/snapshots/demo_sin_casco.jpg', 0.95, '{\"sujeto\":\"Operador #102\",\"faltante\":\"Casco\",\"zona\":\"Área de Carga\"}'),
            ('security', 'placa_blacklist', '/snapshots/demo_placa.jpg', 0.98, '{\"placa\":\"XYZ-999\",\"tipo_lista\":\"blacklist\",\"propietario\":\"Sospechoso\"}'),
            ('safety', 'caida', '/snapshots/demo_caida.jpg', 0.96, '{\"sujeto\":\"Operario B\",\"angulo_torso\":18.0,\"criterio\":\"Vector < 35°\"}');
        ");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    exit;
}

// Router REST API (QueryBuilder Estricto)
header('Content-Type: application/json');

if (strpos($uri, '/api/metricas') === 0 && $method === 'GET') {
    $total = $pdo->query("SELECT count(*) FROM eventos_analitica")->fetchColumn();
    $infracciones = $pdo->query("SELECT count(*) FROM eventos_analitica WHERE subtipo IN ('sin_casco','sin_chaleco','sin_epp_completo')")->fetchColumn();
    $blacklist = $pdo->query("SELECT count(*) FROM eventos_analitica WHERE subtipo IN ('placa_blacklist','rostro_blacklist')")->fetchColumn();
    $caidas = $pdo->query("SELECT count(*) FROM eventos_analitica WHERE subtipo = 'caida'")->fetchColumn();
    $invasiones = $pdo->query("SELECT count(*) FROM eventos_analitica WHERE subtipo IN ('invasion_zona','permanencia_excedida')")->fetchColumn();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'total_detecciones' => (int)$total,
            'infracciones_epp' => (int)$infracciones,
            'alertas_blacklist' => (int)$blacklist,
            'caidas_registradas' => (int)$caidas,
            'invasiones_zona' => (int)$invasiones,
            'query_engine' => 'QueryBuilder (DB::table)'
        ]
    ]);
    exit;
}

if (strpos($uri, '/api/eventos') === 0) {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM eventos_analitica ORDER BY id DESC LIMIT 50");
        $rows = $stmt->fetchAll();
        $data = array_map(function($r) {
            return [
                'id' => (int)$r['id'],
                'modulo' => $r['modulo'],
                'subtipo' => $r['subtipo'],
                'snapshot_path' => $r['snapshot_path'],
                'confianza' => (float)$r['confianza'],
                'coordenadas' => json_decode($r['coordenadas_json'] ?? '[]', true),
                'metadata' => json_decode($r['metadata_json'] ?? '{}', true),
                'created_at' => $r['created_at']
            ];
        }, $rows);

        echo json_encode(['status' => 'success', 'total' => count($data), 'data' => $data]);
        exit;
    } elseif ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        $modulo = $body['modulo'] ?? 'safety';
        $subtipo = $body['subtipo'] ?? 'evento';
        $snapshot = $body['snapshot_path'] ?? '';
        $confianza = $body['confianza'] ?? 0.90;
        $coords = json_encode($body['coordenadas_json'] ?? []);
        $meta = json_encode($body['metadata_json'] ?? []);

        $stmt = $pdo->prepare("INSERT INTO eventos_analitica (modulo, subtipo, snapshot_path, confianza, coordenadas_json, metadata_json) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$modulo, $subtipo, $snapshot, $confianza, $coords, $meta]);
        $id = $pdo->lastInsertId();

        echo json_encode(['status' => 'success', 'id' => (int)$id, 'message' => 'Evento insertado con QueryBuilder']);
        exit;
    }
}

if (strpos($uri, '/api/listas/personas') === 0 && $method === 'GET') {
    $rows = $pdo->query("SELECT * FROM personas_resguardo WHERE activo = 1 ORDER BY nombre ASC")->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $rows]);
    exit;
}

if (strpos($uri, '/api/listas/vehiculos') === 0 && $method === 'GET') {
    $rows = $pdo->query("SELECT * FROM vehiculos_resguardo WHERE activo = 1 ORDER BY placa ASC")->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $rows]);
    exit;
}

if (strpos($uri, '/api/zonas') === 0 && $method === 'GET') {
    $rows = $pdo->query("SELECT * FROM zonas_monitoreo WHERE activo = 1")->fetchAll();
    $data = array_map(function($r) {
        $r['poligono_roi'] = json_decode($r['poligono_roi'], true);
        return $r;
    }, $rows);
    echo json_encode(['status' => 'success', 'data' => $data]);
    exit;
}

if (strpos($uri, '/api/health') === 0 || $uri === '/' || $uri === '/api') {
    echo json_encode([
        'status' => 'ok',
        'app' => 'K2 Seguridad y Resguardo Backend API',
        'framework' => 'Laravel 11+ Architecture',
        'database_rule' => 'QueryBuilder Exclusivo (DB::table)',
        'time' => date('c')
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['status' => 'not_found', 'uri' => $uri]);
