<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DataAutoReportTiaraController extends Controller
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
     * Engine High-Speed Batch: RPM TIARA (Ultra Fast Bulk Execution)
     */
    public function processRpmTiaraBatch(Request $request): JsonResponse
    {
        DB::disableQueryLog();
        set_time_limit(300);
        ini_set('memory_limit', '512M');

        $rows = $request->input('rows', []);
        if (empty($rows) || !is_array($rows)) {
            return response()->json(['message' => 'Tidak ada baris data yang dikirim.'], 400);
        }

        $previewOnly = $request->boolean('preview_only', false);
        $now = Carbon::now()->format('Y-m-d H:i:s');
        
        $ticketNumbers = [];
        $sanitizedData = [];
        $skippedCount  = 0;

        foreach ($rows as $row) {
            if (!is_array($row)) {
                $skippedCount++;
                continue;
            }

            // Normalisasi key array ke lowercase tanpa spasi/symbol agar anti-mismatch dari Excel/Frontend
            $norm = [];
            foreach ($row as $key => $val) {
                $cleanKey = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', (string)$key));
                $norm[$cleanKey] = $val;
            }

            // Fallback multi-alias key untuk Nomor Tiket
            $ticketNumber = $this->cleanString(
                $norm['ticketnumber'] 
                ?? $norm['ticketid'] 
                ?? $norm['noticket'] 
                ?? $norm['notiket'] 
                ?? $norm['tiaraid'] 
                ?? $norm['idtiara'] 
                ?? $norm['norpm'] 
                ?? $norm['ticket'] 
                ?? $row['ticket_number'] ?? $row['tiara_id'] ?? $row['ticketnumber'] ?? $row['norpm'] ?? '', 
                100
            );

            if ($ticketNumber === '') {
                $skippedCount++;
                continue;
            }

            $siteCode    = $this->cleanString($norm['siteoperatorcode'] ?? $norm['siteid'] ?? $norm['sitecode'] ?? $norm['idsite'] ?? $row['siteoperator_code'] ?? '', 100);
            $siteName    = $this->cleanString($norm['siteoperatorname'] ?? $norm['sitename'] ?? $norm['namasite'] ?? $row['siteoperator_name'] ?? '', 255);
            $areaReg     = $this->cleanString($norm['siteareareg'] ?? $norm['region'] ?? $norm['regional'] ?? $norm['areareg'] ?? $row['sitearea_reg'] ?? '', 255);
            $areaTo      = $this->cleanString($norm['siteareato'] ?? $norm['to'] ?? $norm['rtp'] ?? $norm['area'] ?? $norm['areato'] ?? $row['sitearea_to'] ?? '', 255);
            $companyName = $this->cleanString($norm['companyname'] ?? $norm['mitra'] ?? $norm['vendor'] ?? $norm['company'] ?? $norm['namamitra'] ?? $row['company_name'] ?? '', 255);
            $typeName    = $this->cleanString($norm['maintenancetypename'] ?? $norm['maintenancetype'] ?? $norm['tipemaintenance'] ?? $norm['jenispekerjaan'] ?? $row['maintenancetype_name'] ?? '', 255);
            $maintDate   = $this->cleanString($norm['maintenancedate'] ?? $norm['tanggaldone'] ?? $norm['maintdate'] ?? $norm['tglmaintenance'] ?? $row['maintenance_date'] ?? '', 50);
            $statusName  = $this->cleanString($norm['ticketstatusname'] ?? $norm['status'] ?? $norm['approve'] ?? $norm['ticketstatus'] ?? $row['ticket_statusname'] ?? '', 100);

            // Normalisasi Status Dashboard
            $upperStatus = strtoupper($statusName);
            if (str_contains($upperStatus, 'CLOSED') || str_contains($upperStatus, 'DONE') || $upperStatus === 'APPROVED' || $upperStatus === 'OK' || $upperStatus === 'COMPLETED') {
                $dashboardStatus = 'APPROVED';
            } elseif (str_contains($upperStatus, 'REJECT')) {
                $dashboardStatus = 'REJECTED';
            } elseif (str_contains($upperStatus, 'RETURN')) {
                $dashboardStatus = 'RETURNED';
            } else {
                $dashboardStatus = 'PENDING';
            }

            $item = [
                'ticket_number'        => $ticketNumber,
                'siteoperator_code'   => $siteCode ?: null,
                'siteoperator_name'   => $siteName ?: null,
                'sitearea_reg'        => $areaReg ?: null,
                'sitearea_to'         => $areaTo ?: null,
                'company_name'        => $companyName ?: null,
                'maintenancetype_name'=> $typeName ?: null,
                'maintenance_date'    => $maintDate ?: null,
                'ticket_statusname'   => $statusName ?: null,
                'dashboard_status'    => $dashboardStatus,
                'created_at'          => $now,
                'updated_at'          => $now,
            ];

            $ticketNumbers[] = $ticketNumber;
            $sanitizedData[$ticketNumber] = $item;
        }

        if (empty($ticketNumbers)) {
            return response()->json([
                'status'   => 'success',
                'inserted' => 0,
                'updated'  => 0,
                'skipped'  => $skippedCount,
                'rows'     => [],
            ]);
        }

        $uniqueIds = array_values(array_unique($ticketNumbers));
        $allRows   = array_values($sanitizedData);

        try {
            // 1. Cek Tiket yang Sudah Ada di Database per 1.000 batch
            $existingMasters = [];
            foreach (array_chunk($uniqueIds, 1000) as $chunkIds) {
                $found = DB::table('rpm_tiara_masters')
                    ->whereIn('ticket_number', $chunkIds)
                    ->pluck('dashboard_status', 'ticket_number')
                    ->toArray();
                foreach ($found as $tk => $st) {
                    $existingMasters[$tk] = $st;
                }
            }

            // 2. Mode Pratinjau (Preview XLOOKUP)
            if ($previewOnly) {
                $previewList = [];
                $insertedCount = 0;
                $updatedCount  = 0;

                foreach ($allRows as $row) {
                    $tk = $row['ticket_number'];
                    $exists = array_key_exists($tk, $existingMasters);
                    if ($exists) {
                        $updatedCount++;
                        $previewList[] = array_merge($row, [
                            'is_new'         => false,
                            'xlookup_status' => 'UPDATE',
                            'status_xlookup' => 'UPDATE',
                            'status_desc'    => "Update ({$existingMasters[$tk]} -> {$row['dashboard_status']})",
                        ]);
                    } else {
                        $insertedCount++;
                        $previewList[] = array_merge($row, [
                            'is_new'         => true,
                            'xlookup_status' => '#N/A',
                            'status_xlookup' => '#N/A',
                            'status_desc'    => '#N/A (Tiket Baru)',
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

            // 3. Mode Simpan Ke Database (Ultra-Fast Bulk Delete + Insert)
            $existingTicketNumbers = array_keys($existingMasters);
            $updatedCount  = count($existingTicketNumbers);
            $insertedCount = count($allRows) - $updatedCount;

            DB::beginTransaction();

            // (A) Hapus record lama yang mau di-update agar query tidak menggantung / timeout
            if (!empty($existingTicketNumbers)) {
                foreach (array_chunk($existingTicketNumbers, 1000) as $chunkIds) {
                    DB::table('rpm_tiara_masters')->whereIn('ticket_number', $chunkIds)->delete();
                }
            }

            // (B) Direct Bulk Insert SEMUA Data (Baru + Update) per 1000 batch
            if (!empty($allRows)) {
                foreach (array_chunk($allRows, 1000) as $chunk) {
                    DB::table('rpm_tiara_masters')->insert($chunk);
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
            Log::error("Process RPM TIARA Batch Error: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal menyimpan ke database: ' . $e->getMessage()
            ], 500);
        }
    }

    public function processTiaraBatch(Request $request): JsonResponse
    {
        return $this->processRpmTiaraBatch($request);
    }

    public function processRpmTiara(Request $request): RedirectResponse
    {
        return back()->with('info', 'Gunakan antarmuka web untuk pemrosesan berbasis live progress.');
    }
}