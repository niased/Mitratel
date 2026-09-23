<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DataManagementController;
use App\Http\Controllers\DataManagementTiaraController;
use App\Http\Controllers\DataAutoReportController;
use App\Http\Controllers\DataAutoReportTiaraController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AssetDashboardController;
use App\Http\Controllers\AssetDataManagementController;
use App\Http\Controllers\Api\CombatTripController;
use App\Models\CombatTrip;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// =========================================================================
// 1. PUBLIC ROUTES (Tanpa Login)
// =========================================================================

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
})->name('welcome');

// --- HALAMAN UI DRIVER ---
Route::get('/track/{token}', function ($token) {
    $trip = CombatTrip::with(['combat', 'latestCoordinate'])->where('tracking_token', $token)->first();

    if (!$trip) {
        abort(404, 'Link tracking tidak valid atau sudah kadaluarsa.');
    }

    return Inertia::render('Track/DrivePage', [
        'trip' => $trip
    ]);
})->name('track.driver');

// --- API TRACKING DRIVER ---
Route::prefix('track-api')->group(function () {
    Route::get('/{token}/status', [CombatTripController::class, 'getDriverLiveStatus']);
    Route::post('/{token}/start', [CombatTripController::class, 'startTrip']);
    Route::post('/{token}/ping', [CombatTripController::class, 'ping']);
    Route::post('/{token}/complete', [CombatTripController::class, 'completeTrip']);
});

Route::prefix('api/track')->group(function () {
    Route::get('/{token}/status', [CombatTripController::class, 'getDriverLiveStatus']);
    Route::post('/{token}/start', [CombatTripController::class, 'startTrip']);
    Route::post('/{token}/ping', [CombatTripController::class, 'ping']);
    Route::post('/{token}/complete', [CombatTripController::class, 'completeTrip']);
});

// ENDPOINT CRON VERCEL (RESET BULANAN OTOMATIS TANPA LOGIN)
Route::match(['get', 'delete'], '/combat-api/history/reset-monthly', [CombatTripController::class, 'resetMonthlyTripsHistory']);
Route::match(['get', 'delete'], '/api/combat-api/history/reset-monthly', [CombatTripController::class, 'resetMonthlyTripsHistory']);


// =========================================================================
// 2. AUTHENTICATED ROUTES (Wajib Login)
// =========================================================================
Route::middleware(['auth'])->group(function () {
    
    // HOME
    Route::get('/home', [DashboardController::class, 'index'])->name('home');

    // PROFIL
    Route::controller(ProfileController::class)->prefix('profile')->name('profile.')->group(function () {
        Route::get('/', 'edit')->name('edit');
        Route::patch('/', 'update')->name('update');
        Route::delete('/', 'destroy')->name('destroy');
    });

    // ADMIN USERS
    Route::prefix('admin')->name('admin.users.')->controller(UserController::class)->group(function () {
        Route::get('/users', 'index')->name('index');
        Route::post('/users', 'store')->name('store');
        Route::put('/users/{user}', 'update')->name('update');
        Route::delete('/users/{user}', 'destroy')->name('destroy');
        Route::post('/users/bulk-delete', 'bulkDelete')->name('bulk-delete');
    });

    // MODUL MAINTENANCE
    Route::prefix('maintenance')->name('maintenance.')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'maintenance'])->name('dashboard');
        
        Route::prefix('data-management')->name('data-management.')->group(function () {
            Route::get('/', [DataManagementController::class, 'index'])->name('index');
            
            // --- ENGINE AUTO REPORT BATCH (RPM ANT & SMARTKEY) ---
            Route::post('/process-rpm', [DataAutoReportController::class, 'processRpm'])->name('process-rpm');
            Route::post('/process-rpm-batch', [DataAutoReportController::class, 'processRpmBatch'])->name('process-rpm-batch');
            Route::post('/process-smartkey', [DataAutoReportController::class, 'processSmartkey'])->name('process-smartkey');
            Route::post('/process-smartkey-batch', [DataAutoReportController::class, 'processSmartkeyBatch'])->name('process-smartkey-batch');

            // --- ENGINE AUTO REPORT BATCH (RPM TIARA) ---
            Route::post('/process-rpm-tiara', [DataAutoReportTiaraController::class, 'processRpmTiara'])->name('process-rpm-tiara');
            Route::post('/process-rpm-tiara-batch', [DataAutoReportTiaraController::class, 'processRpmTiaraBatch'])->name('process-rpm-tiara-batch');
            Route::post('/process-tiara', [DataAutoReportTiaraController::class, 'processRpmTiara'])->name('process-tiara');
            Route::post('/process-tiara-batch', [DataAutoReportTiaraController::class, 'processRpmTiaraBatch'])->name('process-tiara-batch');

            // --- MASTER RPM ANT (LEGACY) ---
            Route::post('/rpm', [DataManagementController::class, 'storeRpm'])->name('store-rpm');
            Route::put('/rpm/{id}', [DataManagementController::class, 'updateRpm'])->name('update-rpm');
            Route::delete('/rpm/{id?}', [DataManagementController::class, 'destroyRpm'])->name('destroy-rpm');
            Route::post('/rpm/bulk-delete', [DataManagementController::class, 'bulkDestroyRpm'])->name('bulk-destroy-rpm');
            Route::post('/rpm/reset', [DataManagementController::class, 'resetRpm'])->name('reset-rpm');
            Route::get('/rpm/export', [DataManagementController::class, 'exportRpm'])->name('export-rpm');

            // --- MASTER RPM TIARA ---
            Route::post('/rpm-tiara', [DataManagementTiaraController::class, 'storeRpmTiara'])->name('store-rpm-tiara');
            Route::put('/rpm-tiara/{id}', [DataManagementTiaraController::class, 'updateRpmTiara'])->name('update-rpm-tiara');
            Route::delete('/rpm-tiara/{id?}', [DataManagementTiaraController::class, 'destroyRpmTiara'])->name('destroy-rpm-tiara');
            Route::post('/rpm-tiara/bulk-delete', [DataManagementTiaraController::class, 'bulkDestroyRpmTiara'])->name('bulk-destroy-rpm-tiara');
            Route::post('/rpm-tiara/reset', [DataManagementTiaraController::class, 'resetRpmTiara'])->name('reset-rpm-tiara');
            Route::get('/rpm-tiara/export', [DataManagementTiaraController::class, 'exportRpmTiara'])->name('export-rpm-tiara');

            // --- ALIAS ROUTE MASTER TIARA (SESUAI SUBTAB 'TIARA' DI REACT) ---
            Route::post('/tiara', [DataManagementTiaraController::class, 'storeRpmTiara'])->name('store-tiara');
            Route::put('/tiara/{id}', [DataManagementTiaraController::class, 'updateRpmTiara'])->name('update-tiara');
            Route::delete('/tiara/{id?}', [DataManagementTiaraController::class, 'destroyRpmTiara'])->name('destroy-tiara');
            Route::post('/tiara/bulk-delete', [DataManagementTiaraController::class, 'bulkDestroyRpmTiara'])->name('bulk-destroy-tiara');
            Route::post('/tiara/reset', [DataManagementTiaraController::class, 'resetRpmTiara'])->name('reset-tiara');
            Route::get('/tiara/export', [DataManagementTiaraController::class, 'exportRpmTiara'])->name('export-tiara');
            
            // --- MASTER SMARTKEY ---
            Route::post('/smartkey', [DataManagementController::class, 'storeSmartkey'])->name('store-smartkey');
            Route::put('/smartkey/{id}', [DataManagementController::class, 'updateSmartkey'])->name('update-smartkey');
            Route::delete('/smartkey/{id?}', [DataManagementController::class, 'destroySmartkey'])->name('destroy-smartkey');
            Route::post('/smartkey/bulk-delete', [DataManagementController::class, 'bulkDestroySmartkey'])->name('bulk-destroy-smartkey');
            Route::post('/smartkey/reset', [DataManagementController::class, 'resetSmartkey'])->name('reset-smartkey');
            Route::get('/smartkey/export', [DataManagementController::class, 'exportSmartkey'])->name('export-smartkey');
        });
    });

    // MODUL ASSETS
    Route::prefix('assets')->name('assets.')->group(function () {
        Route::get('/dashboard', [AssetDashboardController::class, 'index'])->name('dashboard');
        Route::prefix('data-management')->name('data-management.')->controller(AssetDataManagementController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/combat', 'storeCombat')->name('store-combat');
            Route::put('/combat/{id}', 'updateCombat')->name('update-combat');
            Route::delete('/combat/{id?}', 'destroyCombat')->name('destroy-combat');
            Route::post('/combat/bulk-delete', 'bulkDestroyCombat')->name('bulk-destroy-combat');
            Route::post('/combat/reset', 'resetCombat')->name('reset-combat');
            Route::get('/combat/export', 'exportCombat')->name('export-combat');
        });
    });

    // =========================================================================
    // 3. API COMBAT DASHBOARD & MANAGEMENT
    // =========================================================================
    Route::prefix('combat-api')->group(function () {
        Route::get('/active', [CombatTripController::class, 'getActiveTrip']);
        Route::get('/trips/active', [CombatTripController::class, 'getActiveTrip']);
        Route::get('/live-positions', [CombatTripController::class, 'getLivePositions']);
        Route::get('/history', [CombatTripController::class, 'getAllTripsHistory']);
        Route::get('/trips/history', [CombatTripController::class, 'getAllTripsHistory']);
        Route::get('/trips/{id}/route', [CombatTripController::class, 'getTripRoute']);
        Route::get('/history/export', [CombatTripController::class, 'exportTripsHistory']);
        Route::post('/dispatch', [CombatTripController::class, 'createTrip']);
        Route::post('/trips', [CombatTripController::class, 'createTrip']);
        Route::put('/trips/{id}', [CombatTripController::class, 'updateTrip']);
        Route::post('/trips/{id}/cancel', [CombatTripController::class, 'cancelTrip']);
        Route::delete('/trips/{id}', [CombatTripController::class, 'destroyTrip']);
    });

    Route::prefix('api/combat')->group(function () {
        Route::get('/active', [CombatTripController::class, 'getActiveTrip']);
        Route::get('/trips/active', [CombatTripController::class, 'getActiveTrip']);
        Route::get('/live-positions', [CombatTripController::class, 'getLivePositions']);
        Route::get('/history', [CombatTripController::class, 'getAllTripsHistory']);
        Route::get('/trips/history', [CombatTripController::class, 'getAllTripsHistory']);
        Route::get('/trips/{id}/route', [CombatTripController::class, 'getTripRoute']);
        Route::get('/history/export', [CombatTripController::class, 'exportTripsHistory']);
        Route::post('/dispatch', [CombatTripController::class, 'createTrip']);
        Route::post('/trips', [CombatTripController::class, 'createTrip']);
        Route::put('/trips/{id}', [CombatTripController::class, 'updateTrip']);
        Route::post('/trips/{id}/cancel', [CombatTripController::class, 'cancelTrip']);
        Route::delete('/trips/{id}', [CombatTripController::class, 'destroyTrip']);
    });
});

require __DIR__ . '/auth.php';