<?php

namespace App\Http\Controllers;

use App\Models\RpmMaster;
use App\Models\SmartkeyMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DataAutoReportController extends Controller
{
    private function cleanString(mixed $value, int $maxLength = 255): string
    {
        if (is_null($value)) {
            return '';
        }
        $trimmed = trim((string)$value);
        return mb_substr($trimmed, 0, $maxLength, 'UTF-8');
    }

    /**
     * Engine High-Speed Batch: Aiven PostgreSQL & Vercel Optimized
     * Mendukung mode XLOOKUP Preview (preview_only) & Commit Insert/Update
     */
    public function processRpmBatch(Request $request): JsonResponse
    {
        $rows = $request->input('rows', []);
        if (empty($rows) || !is_array($rows)) {
            return response()->json(['message' => 'Tidak ada baris data yang dikirim.'], 400);
        }

        $previewOnly = $request->boolean('preview_only', false);
        $now = now();
        $rpmIds = [];
        $sanitizedRows = [];
        $skippedCount = 0;

        foreach ($rows as $row) {
            $rpmId   = $this->cleanString($row['rpm_id'] ?? $row['rpmid'] ?? $row['id_rpm'] ?? '', 100);
            $siteId  = $this->cleanString($row['site_id'] ?? $row['siteid'] ?? '', 100);
            $rtp     = $this->cleanString($row['rtp'] ?? $row['region'] ?? '', 255);
            $mitra   = $this->cleanString($row['mitra'] ?? $row['vendor'] ?? '', 255);
            $bulan   = $this->cleanString($row['bulan'] ?? $row['month'] ?? '', 50);
            $tahun   = $this->cleanString($row['tahun'] ?? $row['year'] ?? '', 50);
            $tglSub  = $this->cleanString($row['tanggal_submit'] ?? $row['tanggalsubn'] ?? $row['tglsubmit'] ?? '', 100);
            $tglApp  = $this->cleanString($row['tanggal_approve'] ?? $row['tanggalappr'] ?? $row['tglapprove'] ?? '', 100);
            $approve = $this->cleanString($row['approve'] ?? $row['status_approve'] ?? $row['status'] ?? '', 100);

            if ($rpmId === '') {
                $skippedCount++;
                continue;
            }

            // 1. Perbaiki Typo Tahun (20205 -> 2025)
            if ($tahun === '20205' || $tahun === '20250') {
                $tahun = '2025';
            }
            
            // 2. Hapus spasi Site ID
            $siteId = str_replace(' ', '', $siteId);

            // 3. Filter ketat: HANYA izinkan 2025 dan 2026
            if ($tahun !== '2025' && $tahun !== '2026') {
                $skippedCount++;
                continue;
            }

            // 4. Standarisasi RTP: Hapus seluruh spasi & uppercase (Anti Duplikat RTP)
            $rtp = strtoupper(str_replace(' ', '', $rtp));

            // 5. Filter RTP Jakarta
            if (stripos($rtp, 'JAKARTA') !== false) {
                $skippedCount++;
                continue;
            }

            $siteId  = $siteId !== '' ? $siteId : $rpmId;
            $approve = $approve !== '' ? $approve : 'BELUM APPROVED';

            $rpmIds[] = $rpmId;
            $sanitizedRows[$rpmId] = [
                'rpm_id'          => $rpmId,
                'site_id'         => $siteId,
                'rtp'             => $rtp,
                'mitra'           => $mitra,
                'bulan'           => $bulan,
                'tahun'           => $tahun,
                'tanggal_submit'  => $tglSub,
                'tanggal_approve' => $tglApp,
                'approve'         => $approve,
                'created_at'      => $now,
                'updated_at'      => $now,
            ];
        }

        if (empty($rpmIds)) {
            return response()->json([
                'status'   => 'success',
                'inserted' => 0,
                'updated'  => 0,
                'skipped'  => $skippedCount,
                'rows'     => [],
            ]);
        }

        $uniqueIds  = array_values(array_unique($rpmIds));
        $allInserts = array_values($sanitizedRows);

        try {
            // Auto XLOOKUP ke tabel Master Data RPM
            $existingMasters = DB::table('rpm_masters')
                ->whereIn('rpm_id', $uniqueIds)
                ->pluck('approve', 'rpm_id')
                ->toArray();

            $existingIds   = array_keys($existingMasters);
            $updatedCount  = count($existingIds);
            $insertedCount = count($uniqueIds) - $updatedCount;

            // Mode Pratinjau
            if ($previewOnly) {
                $previewList = [];

                foreach ($allInserts as $row) {
                    $exists = array_key_exists($row['rpm_id'], $existingMasters);
                    
                    if ($exists) {
                        $oldApprove = $existingMasters[$row['rpm_id']] ?? '-';
                        $previewList[] = array_merge($row, [
                            'is_new'         => false,
                            'xlookup_status' => 'UPDATE',
                            'old_approve'    => $oldApprove,
                            'status_desc'    => "Update ({$oldApprove} → {$row['approve']})",
                        ]);
                    } else {
                        $previewList[] = array_merge($row, [
                            'is_new'         => true,
                            'xlookup_status' => '#N/A',
                            'old_approve'    => '#N/A',
                            'status_desc'    => '#N/A (Data Baru)',
                        ]);
                    }
                }

                return response()->json([
                    'status'   => 'preview',
                    'inserted' => $insertedCount,
                    'updated'  => $updatedCount,
                    'skipped'  => $skippedCount,
                    'rows'     => $previewList,
                ]);
            }

            // Eksekusi Commit Permanen
            DB::beginTransaction();

            if (!empty($existingIds)) {
                DB::table('rpm_masters')->whereIn('rpm_id', $existingIds)->delete();
            }

            if (!empty($allInserts)) {
                foreach (array_chunk($allInserts, 500) as $chunk) {
                    DB::table('rpm_masters')->insert($chunk);
                }
            }

            DB::commit();

            return response()->json([
                'status'   => 'success',
                'inserted' => $insertedCount,
                'updated'  => $updatedCount,
                'skipped'  => $skippedCount,
            ]);
        } catch (\Throwable $e) {
            if (!$previewOnly) {
                DB::rollBack();
            }
            Log::error("Process RPM Batch Error: " . $e->getMessage());
            return response()->json(['message' => 'Gagal memproses batch: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Engine High-Speed Batch: Smart Key Sync Massal (Safe Upsert & XLOOKUP)
     */
    public function processSmartkeyBatch(Request $request): JsonResponse
    {
        $rows = $request->input('rows', []);
        if (empty($rows) || !is_array($rows)) {
            return response()->json(['message' => 'Tidak ada baris data yang dikirim.'], 400);
        }

        $previewOnly = $request->boolean('preview_only', false);
        $now = now();
        $sns = [];
        $sanitizedRows = [];

        foreach ($rows as $row) {
            $lockId          = $this->cleanString($row['lock_id'] ?? $row['lockid'] ?? '', 100);
            $sn              = trim((string)($row['serial_number'] ?? $row['sn'] ?? $row['lock_id'] ?? ''));
            $towerId         = $this->cleanString($row['tower_id'] ?? $row['site_code'] ?? $row['site_id'] ?? '', 100);
            $siteName        = $this->cleanString($row['site_name'] ?? $row['sitename'] ?? '', 255);
            $statusAktifitas = $this->cleanString($row['status_aktifitas'] ?? $row['status_aktivitas'] ?? $row['status'] ?? '', 100);
            $longLat         = $this->cleanString($row['long_lat'] ?? $row['longlat'] ?? $row['coordinate'] ?? '', 255);

            if ($sn === '' && $lockId === '') continue;
            if ($sn === '') $sn = $lockId;
            if ($lockId === '') $lockId = $sn;

            // Normalisasi status ke format standar (LOCKED / UNLOCKED)
            $upperStatus = strtoupper($statusAktifitas);
            if (str_contains($upperStatus, 'UNLOCK') || str_contains($upperStatus, 'OPEN')) {
                $statusClean = 'UNLOCKED';
            } elseif (str_contains($upperStatus, 'LOCK') || str_contains($upperStatus, 'CLOSE')) {
                $statusClean = 'LOCKED';
            } else {
                $statusClean = $statusAktifitas !== '' ? strtoupper($statusAktifitas) : 'LOCKED';
            }

            $sns[] = $sn;
            $sanitizedRows[$sn] = [
                'lock_id'          => $lockId,
                'serial_number'    => $sn,
                'tower_id'         => $towerId,
                'site_name'        => $siteName,
                'status_aktifitas' => $statusClean,
                'long_lat'         => $longLat,
                'status'           => 'AKTIF',
                'created_at'       => $now,
                'updated_at'       => $now,
            ];
        }

        if (empty($sns)) {
            return response()->json(['status' => 'success', 'synced' => 0, 'rows' => []]);
        }

        $uniqueSns  = array_values(array_unique($sns));
        $allInserts = array_values($sanitizedRows);
        $totalCount = count($uniqueSns);

        try {
            // XLOOKUP ke Master Data SmartKey
            $existingMastersRaw = DB::table('smartkey_masters')
                ->whereIn('serial_number', $uniqueSns)
                ->get(['serial_number', 'lock_id', 'tower_id', 'status_aktifitas', 'site_name', 'long_lat']);

            $existingMasters = [];
            foreach ($existingMastersRaw as $item) {
                $cleanKey = trim((string)$item->serial_number);
                $existingMasters[$cleanKey] = $item;
            }

            // 1. MODE PRATINJAU (Preview XLOOKUP sebelum commit)
            if ($previewOnly) {
                $previewList = [];
                $existingCount = 0;

                foreach ($allInserts as $row) {
                    $snKey = trim((string)$row['serial_number']);
                    $exists = array_key_exists($snKey, $existingMasters);
                    
                    if ($exists) {
                        $existingCount++;
                        $oldMaster = $existingMasters[$snKey];
                        $oldStatus = $oldMaster->status_aktifitas ?? '-';
                        $siteName  = $row['site_name'] !== '' ? $row['site_name'] : ($oldMaster->site_name ?? '-');
                        $towerId   = $row['tower_id'] !== '' ? $row['tower_id'] : ($oldMaster->tower_id ?? '-');
                        $longLat   = $row['long_lat'] !== '' ? $row['long_lat'] : ($oldMaster->long_lat ?? '-');
                        $lockId    = $row['lock_id'] !== '' ? $row['lock_id'] : ($oldMaster->lock_id ?? '-');

                        $previewList[] = array_merge($row, [
                            'is_new'         => false,
                            'xlookup_status' => 'UPDATE',
                            'old_status'     => $oldStatus,
                            'lock_id'        => $lockId,
                            'tower_id'       => $towerId,
                            'site_name'      => $siteName,
                            'long_lat'       => $longLat,
                            'status_desc'    => "Update ({$oldStatus} → {$row['status_aktifitas']})",
                        ]);
                    } else {
                        $previewList[] = array_merge($row, [
                            'is_new'         => true,
                            'xlookup_status' => '#N/A',
                            'old_status'     => '#N/A',
                            'tower_id'       => $row['tower_id'] !== '' ? $row['tower_id'] : '#N/A',
                            'site_name'      => $row['site_name'] !== '' ? $row['site_name'] : '#N/A',
                            'status_desc'    => '#N/A (Data Baru)',
                        ]);
                    }
                }

                return response()->json([
                    'status'    => 'preview',
                    'total'     => $totalCount,
                    'synced'    => $existingCount,
                    'new_count' => $totalCount - $existingCount,
                    'rows'      => $previewList,
                ]);
            }

            // 2. MODE COMMIT (Perbarui telemetri tanpa merusak metadata master yang ada)
            DB::beginTransaction();

            foreach ($allInserts as $data) {
                $snKey = trim((string)$data['serial_number']);
                $updateData = [
                    'status_aktifitas' => $data['status_aktifitas'],
                    'status'           => 'AKTIF',
                    'updated_at'       => $now,
                ];

                if ($data['lock_id'] !== '') {
                    $updateData['lock_id'] = $data['lock_id'];
                }
                if ($data['tower_id'] !== '') {
                    $updateData['tower_id'] = $data['tower_id'];
                }
                if ($data['site_name'] !== '') {
                    $updateData['site_name'] = $data['site_name'];
                }
                if ($data['long_lat'] !== '') {
                    $updateData['long_lat'] = $data['long_lat'];
                }

                DB::table('smartkey_masters')->updateOrInsert(
                    ['serial_number' => $snKey],
                    $updateData
                );
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'synced' => $totalCount,
            ]);
        } catch (\Throwable $e) {
            if (!$previewOnly) {
                DB::rollBack();
            }
            Log::error("Process SmartKey Batch Error: " . $e->getMessage());
            return response()->json(['message' => 'Gagal memproses batch SmartKey: ' . $e->getMessage()], 500);
        }
    }

    public function processRpm(Request $request): RedirectResponse
    {
        return back()->with('info', 'Gunakan antarmuka web untuk pemrosesan berbasis live progress.');
    }

    public function processSmartkey(Request $request): RedirectResponse
    {
        return back()->with('info', 'Gunakan antarmuka web untuk pemrosesan berbasis live progress.');
    }
}