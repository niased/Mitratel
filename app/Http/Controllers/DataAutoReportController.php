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

            // =========================================================================
            // JIKA HANYA MODE PRATINJAU (XLOOKUP & CEK APPROVE N/A SEBELUM COMMIT)
            // =========================================================================
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
                    'inserted' => $insertedCount, // Jumlah data baru (#N/A)
                    'updated'  => $updatedCount,  // Jumlah data update status
                    'skipped'  => $skippedCount,
                    'rows'     => $previewList,
                ]);
            }

            // =========================================================================
            // EKSEKUSI COMMIT PERMANEN KE DATABASE MASTER DATA
            // =========================================================================
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
     * Engine High-Speed Batch: Smart Key Sync Massal
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
            $sn              = $this->cleanString($row['serial_number'] ?? $row['sn'] ?? $row['lock_id'] ?? '', 100);
            $statusAktifitas = $this->cleanString($row['status_aktifitas'] ?? $row['status_aktivitas'] ?? $row['status'] ?? '', 100);
            $longLat         = $this->cleanString($row['long_lat'] ?? $row['longlat'] ?? $row['coordinate'] ?? '', 255);

            if ($sn === '') continue;

            $sns[] = $sn;
            $sanitizedRows[$sn] = [
                'serial_number'    => $sn,
                'status_aktifitas' => $statusAktifitas !== '' ? $statusAktifitas : 'LOCKED',
                'long_lat'         => $longLat,
                'status'           => 'AKTIF',
                'created_at'       => $now,
                'updated_at'       => $now,
            ];
        }

        if (empty($sns)) {
            return response()->json(['status' => 'success', 'synced' => 0, 'rows' => []]);
        }

        $uniqueSns   = array_values(array_unique($sns));
        $allInserts  = array_values($sanitizedRows);
        $syncedCount = count($uniqueSns);

        try {
            // Cek data yang sudah ada di Master Data SmartKey
            $existingSns = DB::table('smartkey_masters')
                ->whereIn('serial_number', $uniqueSns)
                ->pluck('status_aktifitas', 'serial_number')
                ->toArray();

            if ($previewOnly) {
                $previewList = [];
                foreach ($allInserts as $row) {
                    $exists = array_key_exists($row['serial_number'], $existingSns);
                    $previewList[] = array_merge($row, [
                        'is_new'         => !$exists,
                        'xlookup_status' => !$exists ? '#N/A (SN Baru)' : 'Update Status',
                        'old_status'     => $exists ? ($existingSns[$row['serial_number']] ?? '-') : '#N/A',
                    ]);
                }

                return response()->json([
                    'status' => 'preview',
                    'total'  => $syncedCount,
                    'synced' => count($existingSns),
                    'new'    => $syncedCount - count($existingSns),
                    'rows'   => $previewList,
                ]);
            }

            DB::beginTransaction();
            DB::table('smartkey_masters')->whereIn('serial_number', $uniqueSns)->delete();

            if (!empty($allInserts)) {
                foreach (array_chunk($allInserts, 500) as $chunk) {
                    DB::table('smartkey_masters')->insert($chunk);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'synced' => $syncedCount,
            ]);
        } catch (\Throwable $e) {
            if (!$previewOnly) {
                DB::rollBack();
            }
            Log::error("Process SmartKey Batch Error: " . $e->getMessage());
            return response()->json(['message' => 'Gagal memproses batch: ' . $e->getMessage()], 500);
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