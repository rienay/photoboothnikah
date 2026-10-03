<?php
@ini_set('memory_limit', '256M');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Find server_storage.json in current dir or parent dir
$file = file_exists(__DIR__ . '/server_storage.json') 
    ? __DIR__ . '/server_storage.json' 
    : (file_exists(dirname(__DIR__) . '/server_storage.json') 
        ? dirname(__DIR__) . '/server_storage.json' 
        : dirname(__DIR__) . '/server_storage.json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo json_encode(new stdClass());
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    if ($input) {
        $saved = @file_put_contents($file, $input);
        if ($saved !== false) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Permission denied writing to server_storage.json']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No data received']);
    }
    exit;
}
