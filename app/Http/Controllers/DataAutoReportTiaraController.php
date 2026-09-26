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
     * Helper Pembersih Tanggal Cepat & Safe untuk PostgreSQL
     */
    private function cleanDate(mixed $value): ?string
    {
        if (is_null($value)) {
            return null;
        }
        $str = trim((string)$value);
        if ($str === '' || $str === '0000-00-00' || strcasecmp($str, 'null') === 0) {
            return null;
        }
        // Fast path untuk format standar YYYY-MM-DD atau YYYY/MM/DD
        if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/', $str, $matches)) {
            return sprintf('%04d-%02d-%02d', (int)$matches[1], (int)$matches[2], (int)$matches[3]);
        }
        try {
            return Carbon::parse($str)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Engine High-Speed Batch: RPM TIARA (Ultra Fast & PostgreSQL Safe)
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

            // Normalisasi key array ke lowercase tanpa spasi/symbol
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
                ?? $row['ticket_number'] ?? $row['tiara_id'] ?? '', 
                100
            );

            if ($ticketNumber === '') {
                $skippedCount++;
                continue;
            }

            $siteCode    = $this->cleanString($norm['siteoperatorcode'] ?? $norm['siteid'] ?? $norm['sitecode'] ?? $norm['idsite'] ?? $row['siteoperator_code'] ?? '', 100);
            $siteName    = $this->cleanString($norm['siteoperator_name'] ?? $norm['siteoperatorcode'] ?? $norm['siteid'] ?? $norm['sitename'] ?? $norm['namasite'] ?? $norm['namatower'] ?? $row['siteoperator_name'] ?? '', 255);
            $areaReg     = $this->cleanString($norm['siteareareg'] ?? $norm['region'] ?? $norm['regional'] ?? $norm['areareg'] ?? $row['sitearea_reg'] ?? '', 255);
            $areaTo      = $this->cleanString($norm['siteareato'] ?? $norm['to'] ?? $norm['rtp'] ?? $norm['area'] ?? $norm['areato'] ?? $row['sitearea_to'] ?? '', 255);
            $companyName = $this->cleanString($norm['companyname'] ?? $norm['mitra'] ?? $norm['vendor'] ?? $norm['company'] ?? $norm['namamitra'] ?? $row['company_name'] ?? '', 255);
            $typeName    = $this->cleanString($norm['maintenancetypename'] ?? $norm['maintenancetype'] ?? $norm['tipemaintenance'] ?? $norm['jenispekerjaan'] ?? $row['maintenancetype_name'] ?? '', 255);
            
            // Pembersihan Tanggal Maintenance
            $rawMaintDate = $norm['maintenancedate'] ?? $norm['tanggaldone'] ?? $norm['maintdate'] ?? $norm['tglmaintenance'] ?? $row['maintenance_date'] ?? null;
            $maintDate    = $this->cleanDate($rawMaintDate);

            $statusName  = $this->cleanString($norm['ticketstatusname'] ?? $norm['status'] ?? $norm['approve'] ?? $norm['ticketstatus'] ?? $row['ticket_statusname'] ?? '', 100);

            if ($siteName === '') {
                $siteName = $siteCode;
            }

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
                'maintenance_date'    => $maintDate,
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
            // 1. Mode Pratinjau (Preview XLOOKUP)
            if ($previewOnly) {
                $existingMasters = [];
                foreach (array_chunk($uniqueIds, 1000) as $chunkIds) {
                    $found = DB::table('rpm_tiara_masters')
                        ->whereIn('ticket_number', $chunkIds)
                        ->get(['ticket_number', 'dashboard_status', 'ticket_statusname']);

                    foreach ($found as $item) {
                        $existingMasters[$item->ticket_number] = [
                            'dashboard_status'  => $item->dashboard_status ?? 'PENDING',
                            'ticket_statusname' => $item->ticket_statusname ?? '',
                        ];
                    }
                }

                $previewList   = [];
                $insertedCount = 0;
                $updatedCount  = 0;

                foreach ($allRows as $row) {
                    $tk = $row['ticket_number'];
                    $exists = array_key_exists($tk, $existingMasters);

                    if ($exists) {
                        $oldMaster    = $existingMasters[$tk];
                        $oldDash      = strtoupper(trim((string)$oldMaster['dashboard_status']));
                        $newDash      = strtoupper(trim((string)($row['dashboard_status'] ?? 'PENDING')));

                        $oldStatusRaw = trim((string)$oldMaster['ticket_statusname']);
                        $newStatusRaw = trim((string)($row['ticket_statusname'] ?? ''));

                        $isDashboardChanged = ($oldDash !== $newDash);
                        $isRawStatusChanged = ($oldStatusRaw !== '' && $newStatusRaw !== '' && strtolower($oldStatusRaw) !== strtolower($newStatusRaw));

                        if ($isDashboardChanged || $isRawStatusChanged) {
                            $updatedCount++;
                            $descText = $isDashboardChanged 
                                ? "Update ({$oldDash} ➔ {$newDash})" 
                                : "Update Status ({$oldStatusRaw} ➔ {$newStatusRaw})";

                            $previewList[] = array_merge($row, [
                                'is_new'         => false,
                                'xlookup_status' => 'UPDATE',
                                'status_xlookup' => 'UPDATE',
                                'status_desc'    => $descText,
                            ]);
                        }
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

            // 2. Mode Simpan (Native PostgreSQL UPSERT - Super Cepat)
            DB::beginTransaction();

            if (!empty($allRows)) {
                // Chunk 250 baris per UPSERT statement (3.000 parameter - Sangat Cepat & Anti-Limit)
                foreach (array_chunk($allRows, 250) as $chunk) {
                    DB::table('rpm_tiara_masters')->upsert(
                        $chunk,
                        ['ticket_number'], // Unique Constraint
                        [
                            'siteoperator_code',
                            'siteoperator_name',
                            'sitearea_reg',
                            'sitearea_to',
                            'company_name',
                            'maintenancetype_name',
                            'maintenance_date',
                            'ticket_statusname',
                            'dashboard_status',
                            'updated_at',
                        ]
                    );
                }
            }

            DB::commit();

            return response()->json([
                'status'   => 'success',
                'inserted' => count($allRows),
                'updated'  => 0,
                'skipped'  => $skippedCount,
            ]);

        } catch (\Throwable $e) {
            if (!$previewOnly) {
                DB::rollBack();
            }
            
            $cleanErrMsg = str_replace(["\r", "\n", "'", '"'], " ", $e->getMessage());
            Log::error("Process RPM TIARA Batch Error: " . substr($cleanErrMsg, 0, 250));

            return response()->json([
                'message' => 'Gagal menyimpan data ke database: ' . substr($cleanErrMsg, 0, 150)
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