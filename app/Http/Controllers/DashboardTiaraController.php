<?php

namespace App\Http\Controllers;

use App\Models\RpmTiaraMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardTiaraController extends Controller
{
    private function parseFilterValue(mixed $input, string $default = 'ALL'): string
    {
        if (is_null($input)) {
            return $default;
        }

        if (is_array($input)) {
            $val = $input['value'] ?? $input['id'] ?? reset($input);
            return !empty($val) ? (string) $val : $default;
        }

        return (string) $input;
    }

    /**
     * Normalisasi Nama TO / Area TANPA SPASI (Contoh: TO BEKASI BARAT -> TOBEKASIBARAT)
     */
    private function normalizeToName(?string $raw): string
    {
        if (empty($raw)) return 'UNASSIGNED';

        $clean = strtoupper(trim($raw));
        // Hapus seluruh spasi dan karakter non-alphanumeric
        $clean = preg_replace('/[^A-Z0-9]/', '', $clean);

        if (empty($clean)) return 'UNASSIGNED';

        if (!str_starts_with($clean, 'TO')) {
            $clean = 'TO' . $clean;
        }

        return $clean;
    }

    /**
     * Helper ekstraksi bulan (1..12) dan tahun murni dari maintenance_date (tanpa fallback created_at)
     */
    private function extractMonthAndYear(?string $dateStr): array
    {
        if (!empty($dateStr)) {
            $trimmed = trim($dateStr);
            
            if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/', $trimmed, $m)) {
                return [(int)$m[2], (string)$m[1]];
            }
            if (preg_match('/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/', $trimmed, $m)) {
                return [(int)$m[2], (string)$m[3]];
            }

            try {
                $dt = Carbon::parse($trimmed);
                return [$dt->month, (string)$dt->year];
            } catch (\Exception $e) {}
        }

        return [null, null];
    }

    /**
     * Mengambil seluruh data agregasi RPM TIARA untuk Dashboard
     */
    public function getSummaryData(Request $request): array
    {
        @set_time_limit(120);

        $tiaraTahun = $this->parseFilterValue($request->input('tahun'), 'ALL');
        $tiaraRtp   = $this->parseFilterValue($request->input('rtp'), 'ALL');

        // Menggunakan DB::table untuk performa optimal (Fast & Low Memory)
        $records = DB::table('rpm_tiara_masters')->get();

        // 1. DEDUPLIKASI SITE ID PER BULAN & NORMALISASI TO / AREA
        $dedupedRecords = [];
        $availableYears = [];

        foreach ($records as $row) {
            [$m, $y] = $this->extractMonthAndYear($row->maintenance_date ?? null);
            if (!$m || !$y) continue;

            $availableYears[$y] = true;

            if (!empty($tiaraTahun) && strtoupper($tiaraTahun) !== 'ALL' && $y !== $tiaraTahun) {
                continue;
            }

            $toNormalized = $this->normalizeToName($row->sitearea_to ?? $row->to ?? '');

            if (!empty($tiaraRtp) && strtoupper($tiaraRtp) !== 'ALL') {
                $targetRtp = $this->normalizeToName($tiaraRtp);
                if ($toNormalized !== $targetRtp) {
                    continue;
                }
            }

            $siteId = trim($row->site_id ?? $row->siteid ?? $row->no_tiket_tiara ?? $row->id ?? '');
            if (empty($siteId)) {
                $siteId = 'UNKNOWN_' . uniqid();
            }

            $st = strtoupper(trim($row->dashboard_status ?? ''));

            $rank = match ($st) {
                'APPROVED', 'OK', 'DONE' => 1,
                'REJECTED', 'REJECT'     => 2,
                'RETURNED', 'RETURN'     => 3,
                default                  => 4
            };

            $uniqueKey = "{$y}_{$m}_{$siteId}";

            if (!isset($dedupedRecords[$uniqueKey]) || $rank < $dedupedRecords[$uniqueKey]['rank']) {
                $dedupedRecords[$uniqueKey] = [
                    'month'   => $m,
                    'year'    => $y,
                    'site_id' => $siteId,
                    'to'      => $toNormalized,
                    'status'  => $st,
                    'rank'    => $rank,
                ];
            }
        }

        // 2. KALKULASI AGREGASI HASIL DEDUPLIKASI
        $totDoc = 0; $totApp = 0; $totRej = 0; $totRet = 0; $totPen = 0;

        $monthlyParsed = [];
        for ($i = 1; $i <= 12; $i++) {
            $monthlyParsed[$i] = ['ok' => 0, 'belum' => 0, 'reject' => 0, 'returnVal' => 0];
        }

        $toPivotMap = [];

        foreach ($dedupedRecords as $item) {
            $totDoc++;
            $st = $item['status'];
            $m  = $item['month'];
            $to = $item['to'];

            if (!isset($toPivotMap[$to])) {
                $toPivotMap[$to] = ['ok' => 0, 'belum' => 0, 'reject' => 0, 'returnVal' => 0, 'total' => 0];
            }
            $toPivotMap[$to]['total']++;

            if ($st === 'APPROVED' || $st === 'OK' || $st === 'DONE') {
                $totApp++;
                $statusCategory = 'ok';
                $toPivotMap[$to]['ok']++;
            } elseif ($st === 'REJECTED' || $st === 'REJECT') {
                $totRej++;
                $statusCategory = 'reject';
                $toPivotMap[$to]['reject']++;
            } elseif ($st === 'RETURNED' || $st === 'RETURN') {
                $totRet++;
                $statusCategory = 'returnVal';
                $toPivotMap[$to]['returnVal']++;
            } else {
                $totPen++;
                $statusCategory = 'belum';
                $toPivotMap[$to]['belum']++;
            }

            if ($m >= 1 && $m <= 12) {
                $monthlyParsed[$m][$statusCategory]++;
            }
        }

        // 3. FORMAT TABEL PIVOT TO / AREA
        $tiaraRtpPivot = [];
        foreach ($toPivotMap as $toName => $countsData) {
            $tot = $countsData['total'];
            $ok  = $countsData['ok'];
            $tiaraRtpPivot[] = [
                'rtp'       => $toName,
                'ok'        => $ok,
                'belum'     => $countsData['belum'],
                'reject'    => $countsData['reject'],
                'returnVal' => $countsData['returnVal'],
                'total'     => $tot,
                'pct'       => $tot > 0 ? round(($ok / $tot) * 100) : 0,
            ];
        }

        usort($tiaraRtpPivot, fn($a, $b) => strcmp($a['rtp'], $b['rtp']));

        // 4. FORMAT CHART & PIVOT BULANAN
        $monthsName     = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        $fullMonthsName = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        $chartData = [];
        $rawCounts = ['OK' => [], 'BELUM' => [], 'REJECT' => [], 'RETURN' => []];
        $monthTotals = [];
        $monthPct = [];

        for ($m = 1; $m <= 12; $m++) {
            $pData     = $monthlyParsed[$m];
            $okVal     = $pData['ok'];
            $belumVal  = $pData['belum'];
            $rejectVal = $pData['reject'];
            $retVal    = $pData['returnVal'];

            $rawCounts['OK'][]     = $okVal;
            $rawCounts['BELUM'][]  = $belumVal;
            $rawCounts['REJECT'][] = $rejectVal;
            $rawCounts['RETURN'][] = $retVal;

            $mTotal = $okVal + $belumVal + $rejectVal + $retVal;
            $monthTotals[] = $mTotal;
            $monthPct[]    = $mTotal > 0 ? round(($okVal / $mTotal) * 100) : 0;

            $chartData[] = [
                'name'      => $monthsName[$m - 1],
                'monthNum'  => $m,
                'fullMonth' => $fullMonthsName[$m - 1],
                'total'     => $mTotal,
                'ok'        => $okVal,
                'belum'     => $belumVal,
                'reject'    => $rejectVal,
                'return'    => $retVal,
                'pctOk'     => $mTotal > 0 ? round(($okVal / $mTotal) * 100) : 0,
            ];
        }

        $counts = [
            'OK'        => $rawCounts['OK'],
            'BELUM'     => $rawCounts['BELUM'],
            'REJECT'    => $rawCounts['REJECT'],
            'RETURN'    => $rawCounts['RETURN'],
            'ok'        => $rawCounts['OK'],
            'belum'     => $rawCounts['BELUM'],
            'reject'    => $rawCounts['REJECT'],
            'return'    => $rawCounts['RETURN'],
            'returnVal' => $rawCounts['RETURN'],
        ];

        $sumOk     = array_sum($rawCounts['OK']);
        $sumBelum  = array_sum($rawCounts['BELUM']);
        $sumReject = array_sum($rawCounts['REJECT']);
        $sumReturn = array_sum($rawCounts['RETURN']);

        $rowTotals = [
            'OK'        => $sumOk,
            'BELUM'     => $sumBelum,
            'REJECT'    => $sumReject,
            'RETURN'    => $sumReturn,
            'ok'        => $sumOk,
            'belum'     => $sumBelum,
            'reject'    => $sumReject,
            'return'    => $sumReturn,
            'returnVal' => $sumReturn,
        ];

        $overallTotal = array_sum($monthTotals);

        try {
            $rawTos = DB::table('rpm_tiara_masters')
                ->whereNotNull('sitearea_to')
                ->where('sitearea_to', '!=', '')
                ->pluck('sitearea_to');

            $rtpOptions = $rawTos
                ->map(fn($item) => $this->normalizeToName($item))
                ->unique()
                ->sort()
                ->values()
                ->toArray();
        } catch (\Throwable $e) {
            $rtpOptions = [];
        }

        $yearList = array_keys($availableYears);
        sort($yearList);

        return [
            'summary' => [
                'totalSite'     => $totDoc,
                'totalApproved' => $totApp,
                'totalPending'  => $totPen,
                'totalReject'   => $totRej,
                'totalReturn'   => $totRet,
                'chartData'     => $chartData,
                'monthlyPivot'  => [
                    'counts'       => $counts,
                    'monthTotals'  => $monthTotals,
                    'monthPct'     => $monthPct,
                    'rowTotals'    => $rowTotals,
                    'overallTotal' => $overallTotal,
                    'overallPct'   => $overallTotal > 0 ? round(($totApp / $overallTotal) * 100) : 0,
                ],
                'rtpPivot'      => $tiaraRtpPivot,
            ],
            'options' => [
                'tahun' => $yearList,
                'rtp'   => $rtpOptions,
            ],
            'filters' => [
                'tahun' => $tiaraTahun,
                'rtp'   => $tiaraRtp,
            ]
        ];
    }
}