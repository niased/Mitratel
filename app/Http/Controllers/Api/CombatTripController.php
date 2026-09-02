<?php

namespace App\Http\Controllers\Api;

use App\Events\CombatDriverLocationUpdated;
use App\Http\Controllers\Controller;
use App\Models\CombatMaster;
use App\Models\CombatTrip;
use App\Models\CombatTripCoordinate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CombatTripController extends Controller
{
    /**
     * 1. ADMIN/OPERATOR: Membuat Tugas Mobilisasi Baru (Dispatch)
     */
    public function createTrip(Request $request)
    {
        $combatId        = $request->input('combat_master_id') ?? $request->input('combat_id');
        $destinationName = $request->input('destination_name') ?? $request->input('destination');
        $originName      = $request->input('origin_name') ?? 'Gudang / Basecamp';

        $request->merge([
            'combat_master_id' => $combatId,
            'destination_name' => $destinationName,
        ]);

        $request->validate([
            'combat_master_id' => 'required|exists:combat_masters,id',
            'destination_name' => 'required|string|max:255',
            'pic_name'         => 'required|string|max:255',
            'pic_phone'        => 'nullable|string|max:50',
            'origin_name'      => 'nullable|string|max:255',
            'jenis_rute'       => 'nullable|string|max:100',
            'ip_gps'           => 'nullable|string|max:100',
            'destination_lat'  => 'nullable|numeric',
            'destination_lng'  => 'nullable|numeric',
        ]);

        $activeTrip = CombatTrip::where('combat_master_id', $combatId)
            ->whereIn('status', ['ASSIGNED', 'IN_TRANSIT'])
            ->first();

        if ($activeTrip) {
            return response()->json(['message' => 'Unit COMBAT ini sedang dalam status penugasan aktif!'], 400);
        }

        $trip = DB::transaction(function () use ($request, $combatId, $destinationName, $originName) {
            return CombatTrip::create([
                'combat_master_id' => $combatId,
                'pic_user_id'      => $request->user()?->id,
                'pic_name'         => $request->pic_name,
                'pic_phone'        => $request->input('pic_phone') ?? '-',
                'origin_name'      => $originName,
                'destination_name' => $destinationName,
                'destination_lat'  => $request->destination_lat,
                'destination_lng'  => $request->destination_lng,
                'ip_gps'           => $request->input('jenis_rute') ?? $request->ip_gps ?? 'DEPLOY',
                'status'           => 'ASSIGNED',
            ]);
        });

        $trackingUrl = url('/track/' . $trip->tracking_token);

        return response()->json([
            'message'      => 'Tugas mobilisasi berhasil dibuat untuk PIC Driver!',
            'data'         => $trip->load('combat'),
            'tracking_url' => $trackingUrl,
        ], 201);
    }

    /**
     * 2. DASHBOARD: Mengambil Informasi Trip Aktif Terkini
     */
    public function getActiveTrip(Request $request)
    {
        $activeTrip = CombatTrip::with(['combat', 'latestCoordinate'])
            ->whereIn('status', ['ASSIGNED', 'IN_TRANSIT'])
            ->latest('id')
            ->first();

        if ($activeTrip && $activeTrip->combat && $activeTrip->combat->long_lat && str_contains($activeTrip->combat->long_lat, ';')) {
            $coords = explode(';', $activeTrip->combat->long_lat);
            $activeTrip->combat->latitude = (float) trim($coords[0]);
            $activeTrip->combat->longitude = (float) trim($coords[1]);
        }

        return response()->json(['data' => $activeTrip]);
    }

   /**
     * 3. DASHBOARD: Endpoint Polling Posisi Live & Seluruh Unit di Peta
     */
    public function getLivePositions()
    {
        $activeTrip = CombatTrip::with(['combat:id,asset_name,sn,status_combat,long_lat', 'latestCoordinate'])
            ->where('status', 'IN_TRANSIT')
            ->latest('id')
            ->first();

        $combats = CombatMaster::all()->map(function ($item) {
            $lat = $item->latitude ?? null;
            $lng = $item->longitude ?? null;
            if ((!$lat || !$lng) && $item->long_lat && str_contains($item->long_lat, ';')) {
                $parts = explode(';', $item->long_lat);
                $lat = (float) trim($parts[0]);
                $lng = (float) trim($parts[1]);
            }
            return [
                'id'                => $item->id,
                'asset_name'        => $item->asset_name,
                'sn'                => $item->sn ?? '-',
                'type_combat'       => $item->type_combat ?? '-',
                'ketinggian_combat' => $item->ketinggian_combat ?? '-',
                'status_combat'     => $item->status_combat,
                'status_raw'        => $item->status_combat,
                'nama_site'         => $item->nama_site ?? '-',
                'lokasi_saat_ini'   => $item->lokasi_saat_ini ?? '-',
                'latitude'          => $lat ? (float) $lat : null,
                'longitude'         => $lng ? (float) $lng : null,
                'long_lat'          => $item->long_lat,
                'pic_data'          => $item->pic_data ?? $item->pic ?? '-',
                'tanggal_ambil'     => $item->tanggal_ambil ?? '-',
                'tanggal_kembali'   => $item->tanggal_kembali ?? '-',
                'remark'            => $item->remark ?? '-',
                'created_at'        => $item->created_at,
                'updated_at'        => $item->updated_at,
            ];
        });

        return response()->json([
            'active_trip'  => $activeTrip,
            'combats'      => $combats,
            'latest_coord' => $activeTrip?->latestCoordinate,
        ]);
    }
    /**
     * 4. ADMIN: Membatalkan Penugasan Trip
     */
    public function cancelTrip($id)
    {
        $trip = CombatTrip::findOrFail($id);

        if (in_array($trip->status, ['ASSIGNED', 'IN_TRANSIT'])) {
            DB::transaction(function () use ($trip) {
                $trip->update([
                    'status'   => 'CANCELLED',
                    'ended_at' => now(),
                ]);

                if ($trip->combat) {
                    $trip->combat->update(['status_combat' => 'READY TO USE']);
                }
            });

            return response()->json([
                'message' => 'Penugasan berhasil dibatalkan dan status unit kembali READY TO USE.'
            ]);
        }

        return response()->json(['message' => 'Perjalanan sudah selesai atau telah dibatalkan sebelumnya.'], 400);
    }

    /**
     * 5. RIWAYAT: Mengambil Seluruh Histori Perjalanan
     */
    public function getAllTripsHistory(Request $request)
    {
        $search  = $request->input('search');
        $perPage = (int) $request->input('per_page', 50);

        $query = CombatTrip::with([
            'combat:id,asset_name,sn,type_combat,ketinggian_combat'
        ])
        ->select([
            'id', 'tracking_token', 'combat_master_id', 'pic_user_id',
            'pic_name', 'pic_phone', 'origin_name', 'destination_name',
            'destination_lat', 'destination_lng', 'ip_gps', 'status', 
            'started_at', 'ended_at', 'created_at'
        ])
        ->latest('id');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('combat', function ($qc) use ($search) {
                    $qc->where('asset_name', 'like', "%{$search}%")
                       ->orWhere('sn', 'like', "%{$search}%")
                       ->orWhere('type_combat', 'like', "%{$search}%");
                })
                ->orWhere('destination_name', 'like', "%{$search}%")
                ->orWhere('origin_name', 'like', "%{$search}%")
                ->orWhere('pic_name', 'like', "%{$search}%")
                ->orWhere('ip_gps', 'like', "%{$search}%");
            });
        }

        $trips = $query->paginate($perPage);
        return response()->json($trips);
    }

    /**
     * 6. PETA & RIWAYAT: Mengambil Titik Koordinat Rute
     */
    public function getTripRoute($id)
    {
        $trip = CombatTrip::with(['combat', 'coordinates' => function ($q) {
            $q->orderBy('recorded_at', 'asc')->orderBy('id', 'asc');
        }])->findOrFail($id);

        $geoJsonCoords = $trip->coordinates
            ->filter(fn($c) => $c->accuracy === null || (float) $c->accuracy <= 50)
            ->map(fn($c) => [(float) $c->longitude, (float) $c->latitude])
            ->values();

        return response()->json([
            'data' => [
                'trip'        => $trip,
                'coordinates' => $geoJsonCoords,
            ]
        ]);
    }

    /**
     * 7. ADMIN: Mengedit Data Penugasan / Perjalanan
     */
    public function updateTrip(Request $request, $id)
    {
        $trip = CombatTrip::findOrFail($id);

        $request->validate([
            'destination_name' => 'required|string|max:255',
            'origin_name'      => 'nullable|string|max:255',
            'destination_lat'  => 'nullable|numeric',
            'destination_lng'  => 'nullable|numeric',
            'pic_name'         => 'required|string|max:255',
            'pic_phone'        => 'nullable|string|max:50',
            'jenis_rute'       => 'nullable|string|max:100',
            'ip_gps'           => 'nullable|string|max:100',
        ]);

        $trip->update([
            'origin_name'      => $request->origin_name ?? $trip->origin_name,
            'destination_name' => $request->destination_name,
            'destination_lat'  => $request->destination_lat,
            'destination_lng'  => $request->destination_lng,
            'pic_name'         => $request->pic_name,
            'pic_phone'        => $request->pic_phone ?? $trip->pic_phone ?? '-',
            'ip_gps'           => $request->input('jenis_rute') ?? $request->ip_gps ?? $trip->ip_gps ?? 'DEPLOY',
        ]);

        return response()->json([
            'message' => 'Data perjalanan berhasil diperbarui.',
            'data'    => $trip->fresh()->load('combat')
        ]);
    }

    /**
     * 8. ADMIN: Menghapus Riwayat Perjalanan
     */
    public function destroyTrip($id)
    {
        $trip = CombatTrip::findOrFail($id);
        if (in_array($trip->status, ['ASSIGNED', 'IN_TRANSIT']) && $trip->combat) {
            $trip->combat->update(['status_combat' => 'READY TO USE']);
        }
        $trip->delete();

        return response()->json(['message' => 'Riwayat perjalanan berhasil dihapus.']);
    }

    /**
     * 9. DRIVER: Memulai perjalanan (Lock Device)
     */
    public function startTrip(Request $request, $token)
    {
        $trip = CombatTrip::where('tracking_token', $token)->firstOrFail();
        if ($trip->status !== 'ASSIGNED') {
            return response()->json(['message' => 'Trip ini sudah dimulai atau selesai.'], 400);
        }

        $deviceToken = $request->input('device_token');

        DB::transaction(function () use ($trip, $deviceToken) {
            $updateData = [
                'status'     => 'IN_TRANSIT',
                'started_at' => now(),
            ];

            if ($deviceToken && Schema::hasColumn('combat_trips', 'device_token')) {
                $updateData['device_token'] = $deviceToken;
            }

            $trip->update($updateData);

            if ($trip->combat) {
                $trip->combat->update(['status_combat' => 'IN TRANSIT']);
            }
        });

        return response()->json([
            'message'      => 'Perjalanan berhasil dimulai.',
            'device_token' => $trip->fresh()->device_token ?? null
        ]);
    }

    /**
     * 10. DRIVER: Menerima Ping GPS Berkala
     */
    public function ping(Request $request, $token)
    {
        $request->validate([
            'latitude'     => 'required|numeric',
            'longitude'    => 'required|numeric',
            'speed'        => 'nullable|numeric',
            'accuracy'     => 'nullable|numeric',
            'device_token' => 'nullable|string',
        ]);

        $trip = CombatTrip::where('tracking_token', $token)
            ->where('status', 'IN_TRANSIT')
            ->firstOrFail();

        if (!empty($trip->device_token) && $request->filled('device_token')) {
            if ($trip->device_token !== $request->input('device_token')) {
                return response()->json([
                    'status'  => 'locked',
                    'message' => 'Perjalanan ini sedang aktif dikemudikan oleh HP driver lain.'
                ], 403);
            }
        }

        $lat   = (float) $request->latitude;
        $lng   = (float) $request->longitude;
        $speed = (float) ($request->speed ?? 0);
        $acc   = $request->accuracy ? (float) $request->accuracy : null;

        DB::transaction(function () use ($lat, $lng, $speed, $acc, $trip) {
            if ($trip->combat) {
                $trip->combat->update([
                    'long_lat' => $lat . ';' . $lng,
                ]);
            }

            $trip->coordinates()->create([
                'latitude'    => $lat,
                'longitude'   => $lng,
                'speed'       => $speed,
                'accuracy'    => $acc,
                'recorded_at' => now(),
            ]);
        });

        try {
            broadcast(new CombatDriverLocationUpdated($trip, $lat, $lng, $speed, $acc));
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'Ping GPS diterima dan disiarkan live.']);
    }

    /**
     * 11. DRIVER: Menyelesaikan Perjalanan
     */
    public function completeTrip(Request $request, $token)
    {
        $trip = CombatTrip::where('tracking_token', $token)
            ->where('status', 'IN_TRANSIT')
            ->firstOrFail();

        if (!empty($trip->device_token) && $request->filled('device_token')) {
            if ($trip->device_token !== $request->input('device_token')) {
                return response()->json([
                    'status'  => 'locked',
                    'message' => 'Penyelesaian hanya dapat dilakukan oleh HP driver yang memulai perjalanan.'
                ], 403);
            }
        }

        DB::transaction(function () use ($request, $trip) {
            $trip->update([
                'status'   => 'COMPLETED',
                'ended_at' => now(),
            ]);

            if ($trip->combat) {
                $destLower = strtolower($trip->destination_name);
                $finalStatus = 'ONSITE';

                if (str_contains($destLower, 'gudang') || str_contains($destLower, 'basecamp') || str_contains($destLower, 'wh')) {
                    $finalStatus = 'READY TO USE';
                } elseif (str_contains($destLower, 'workshop') || str_contains($destLower, 'repair') || str_contains($destLower, 'perbaikan')) {
                    $finalStatus = 'BROKEN';
                }

                $updateData = [
                    'status_combat'   => $finalStatus,
                    'nama_site'       => $trip->destination_name,
                    'lokasi_saat_ini' => $trip->destination_name,
                ];

                if ($request->has('final_latitude') && $request->has('final_longitude')) {
                    $updateData['long_lat'] = $request->final_latitude . ';' . $request->final_longitude;
                }

                $trip->combat->update($updateData);
            }
        });

        return response()->json(['message' => 'Perjalanan selesai.']);
    }

    /**
     * 12. MODE PANTAU (OBSERVER): Mengambil Status Terkini
     */
    public function getDriverLiveStatus($token)
    {
        $trip = CombatTrip::with(['combat', 'latestCoordinate'])
            ->where('tracking_token', $token)
            ->firstOrFail();

        $latestCoord = $trip->latestCoordinate;
        $driverCoords = null;

        if ($latestCoord) {
            $driverCoords = [
                'latitude'    => (float) $latestCoord->latitude,
                'longitude'   => (float) $latestCoord->longitude,
                'speed'       => (string) ($latestCoord->speed ? round($latestCoord->speed, 1) : '0.0'),
                'accuracy'    => (int) ($latestCoord->accuracy ?? 0),
                'recorded_at' => $latestCoord->recorded_at ? $latestCoord->recorded_at->format('H:i:s') : now()->format('H:i:s'),
            ];
        } elseif ($trip->combat && $trip->combat->long_lat && str_contains($trip->combat->long_lat, ';')) {
            $parts = explode(';', $trip->combat->long_lat);
            $driverCoords = [
                'latitude'    => (float) trim($parts[0]),
                'longitude'   => (float) trim($parts[1]),
                'speed'       => '0.0',
                'accuracy'    => 0,
                'recorded_at' => null,
            ];
        }

        return response()->json([
            'status'           => $trip->status,
            'device_token'     => $trip->device_token ?? null,
            'driver_coords'    => $driverCoords,
            'destination_lat'  => $trip->destination_lat ? (float) $trip->destination_lat : null,
            'destination_lng'  => $trip->destination_lng ? (float) $trip->destination_lng : null,
            'destination_name' => $trip->destination_name,
        ]);
    }

    /**
     * 13. EXPORT EXCEL RIWAYAT
     */
    public function exportTripsHistory(Request $request)
    {
        $trips = CombatTrip::with(['combat', 'picUser'])->latest('id')->get();
        $filename = "Riwayat_Mobilisasi_COMBAT_" . date('Y-m-d_His') . ".csv";

        $headers = [
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename={$filename}",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = [
            'ID Trip', 'Nama Asset COMBAT', 'Serial Number (SN)', 'Tipe COMBAT', 
            'Jenis Pergerakan', 'Titik Asal', 'Site Tujuan', 'PIC Driver', 
            'Status', 'Waktu Mulai', 'Waktu Selesai'
        ];

        return response()->stream(function () use ($trips, $columns) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF");
            fputcsv($file, $columns, ';');

            foreach ($trips as $t) {
                fputcsv($file, [
                    $t->id,
                    $t->combat->asset_name ?? 'Unit COMBAT',
                    $t->combat->sn ?? '-',
                    $t->combat->type_combat ?? '-',
                    $t->ip_gps ?? 'DEPLOY',
                    $t->origin_name ?? 'Gudang / Basecamp',
                    $t->destination_name ?? '-',
                    $t->pic_name ?? '-',
                    $t->status ?? 'COMPLETED',
                    $t->started_at ? $t->started_at->format('Y-m-d H:i:s') : '-',
                    $t->ended_at ? $t->ended_at->format('Y-m-d H:i:s') : '-',
                ], ';');
            }
            fclose($file);
        }, 200, $headers);
    }

    /**
     * 14. RESET RIWAYAT BULANAN
     */
    public function resetMonthlyTripsHistory(Request $request)
    {
        $finishedTrips = CombatTrip::whereIn('status', ['COMPLETED', 'CANCELLED'])->get();
        $count = $finishedTrips->count();

        if ($count === 0) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Tidak ada riwayat selesai yang perlu dibersihkan.'
            ]);
        }

        DB::transaction(function () use ($finishedTrips) {
            foreach ($finishedTrips as $trip) {
                $trip->coordinates()->delete();
                $trip->delete();
            }
        });

        return response()->json([
            'status'  => 'success',
            'message' => "Reset bulanan berhasil! {$count} data riwayat selesai telah dibersihkan."
        ]);
    }
}