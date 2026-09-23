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
     * Helper ekstrak bulan (1..12) dan tahun dari string maintenance_date
     */
    private function extractMonthAndYear(?string $dateStr, $createdAt = null): array
    {
        if (!empty($dateStr)) {
            $trimmed = trim($dateStr);
            
            // Format YYYY-MM-DD
            if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/', $trimmed, $m)) {
                return [(int)$m[2], (string)$m[1]];
            }
            // Format DD-MM-YYYY
            if (preg_match('/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/', $trimmed, $m)) {
                return [(int)$m[2], (string)$m[3]];
            }

            try {
                $dt = Carbon::parse($trimmed);
                return [$dt->month, (string)$dt->year];
            } catch (\Exception $e) {
                // Fallback jika format tanggal tidak baku
            }
        }

        if ($createdAt) {
            try {
                $dt = Carbon::parse($createdAt);
                return [$dt->month, (string)$dt->year];
            } catch (\Exception $e) {}
        }

        return [null, null];
    }

    /**
     * Mengambil seluruh data kalkulasi & agregasi RPM TIARA untuk Dashboard
     */
    public function getSummaryData(Request $request): array
    {
        $tiaraTahun = $this->parseFilterValue($request->input('tahun'), 'ALL');
        $tiaraRtp   = $this->parseFilterValue($request->input('rtp'), 'ALL');

        $tiaraQuery = RpmTiaraMaster::query();

        // 1. FILTER KHUSUS BERDASARKAN KOLOM sitearea_to (TO / Area)
        if (!empty($tiaraRtp) && strtoupper($tiaraRtp) !== 'ALL') {
            $tiaraQuery->where('sitearea_to', '=', $tiaraRtp);
        }

        $tiaraStatusCol    = "UPPER(TRIM(COALESCE(dashboard_status, '')))";
        $tiaraCondApproved = "{$tiaraStatusCol} = 'APPROVED'";
        $tiaraCondReject   = "{$tiaraStatusCol} = 'REJECTED'";
        $tiaraCondReturn   = "{$tiaraStatusCol} = 'RETURNED'";
        $tiaraCondPending  = "({$tiaraStatusCol} = 'PENDING' OR {$tiaraStatusCol} = '')";

        // 2. TABEL PIVOT DIBIKIN GROUP BY sitearea_to (TO / Area)
        $tiaraRtpPivot = (clone $tiaraQuery)
            ->selectRaw("
                COALESCE(NULLIF(TRIM(sitearea_to), ''), 'Unassigned') as rtp_name,
                SUM(CASE WHEN {$tiaraCondApproved} THEN 1 ELSE 0 END) as ok,
                SUM(CASE WHEN {$tiaraCondReject} THEN 1 ELSE 0 END) as reject,
                SUM(CASE WHEN {$tiaraCondReturn} THEN 1 ELSE 0 END) as return_val,
                SUM(CASE WHEN {$tiaraCondPending} THEN 1 ELSE 0 END) as belum,
                COUNT(*) as total
            ")
            ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(sitearea_to), ''), 'Unassigned')"))
            ->get()
            ->map(function ($item) {
                $tot = (int) $item->total;
                $ok  = (int) $item->ok;
                $ret = (int) $item->return_val;
                return [
                    'rtp'       => $item->rtp_name,
                    'ok'        => $ok,
                    'belum'     => (int) $item->belum,
                    'reject'    => (int) $item->reject,
                    'returnVal' => $ret,
                    'total'     => $tot,
                    'pct'       => $tot > 0 ? round(($ok / $tot) * 100) : 0,
                ];
            });

        // 3. KALKULASI BULANAN & OPTION TAHUN
        $monthlyParsed = [];
        for ($i = 1; $i <= 12; $i++) {
            $monthlyParsed[$i] = ['ok' => 0, 'belum' => 0, 'reject' => 0, 'returnVal' => 0];
        }

        $availableYears = [];
        $records = (clone $tiaraQuery)
            ->select(['maintenance_date', 'dashboard_status', 'created_at'])
            ->get();

        $totDoc = 0;
        $totApp = 0;
        $totRej = 0;
        $totRet = 0;
        $totPen = 0;

        foreach ($records as $row) {
            [$m, $y] = $this->extractMonthAndYear($row->maintenance_date, $row->created_at);

            if ($y) {
                $availableYears[$y] = true;
            }

            if (!empty($tiaraTahun) && strtoupper($tiaraTahun) !== 'ALL' && $y !== $tiaraTahun) {
                continue;
            }

            $totDoc++;
            $st = strtoupper(trim($row->dashboard_status ?? ''));

            if ($st === 'APPROVED' || $st === 'OK' || $st === 'DONE') {
                $totApp++;
                $statusCategory = 'ok';
            } elseif ($st === 'REJECTED' || $st === 'REJECT') {
                $totRej++;
                $statusCategory = 'reject';
            } elseif ($st === 'RETURNED' || $st === 'RETURN') {
                $totRet++;
                $statusCategory = 'returnVal';
            } else {
                $totPen++;
                $statusCategory = 'belum';
            }

            if ($m >= 1 && $m <= 12) {
                $monthlyParsed[$m][$statusCategory]++;
            }
        }

        // 4. FORMAT ARRAY CHART & PIVOT BULANAN
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
            'Belum'     => $rawCounts['BELUM'],
            'Reject'    => $rawCounts['REJECT'],
            'Return'    => $rawCounts['RETURN'],
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
            'Belum'     => $sumBelum,
            'Reject'    => $sumReject,
            'Return'    => $sumReturn,
        ];

        $overallTotal = array_sum($monthTotals);
        $overallPct   = $overallTotal > 0 ? round(($sumOk / $overallTotal) * 100) : 0;

        // 5. OPSI DROPDOWN HANYA MENGAMBIL DARI sitearea_to (TO / Area)
        try {
            $rtpOptions = RpmTiaraMaster::query()
                ->select(['sitearea_to'])
                ->whereNotNull('sitearea_to')
                ->where('sitearea_to', '!=', '')
                ->distinct()
                ->pluck('sitearea_to')
                ->filter()
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
                    'overallPct'   => $overallPct,
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