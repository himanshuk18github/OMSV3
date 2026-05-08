<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Settlement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\QueryException;

class SettlementController extends Controller
{
    public function reserveRefNo(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'ref_no' => $this->generateUniqueRefNo(),
            ],
        ]);
    }

    public function checkRef(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ref_no' => ['required', 'string', 'max:100'],
        ]);

        $exists = Settlement::query()
            ->where('transaction_no', $validated['ref_no'])
            ->exists();

        return response()->json([
            'status' => 'success',
            'data' => [
                'exists' => $exists,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $perPage = (int) ($validated['per_page'] ?? 10);
        $search = trim((string) ($validated['search'] ?? ''));

        $rows = Settlement::query()
            ->with(['order:id,ref_no', 'creator:id,name,email'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('transaction_no', 'like', "%{$search}%")
                        ->orWhere('order_ref_no', 'like', "%{$search}%")
                        ->orWhere('payment_gateway', 'like', "%{$search}%")
                        ->orWhereHas('order', function ($orderQuery) use ($search) {
                            $orderQuery->where('ref_no', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('id')
            ->paginate($perPage);

        $rows->getCollection()->transform(function (Settlement $entry) {
            return [
                'id' => $entry->id,
                'ref_no' => $entry->transaction_no,
                'order_id' => $entry->order_ref_no ?: ($entry->order?->ref_no ?: (string) $entry->order_id),
                'sales_channel' => $entry->payment_gateway,
                'amount' => (float) $entry->amount,
                'remarks' => $entry->notes,
                'settlement_type' => $entry->payment_mode,
                'transaction_date' => optional($entry->settlement_date)->format('Y-m-d'),
                'entered_by' => $entry->entered_by ?: ($entry->creator?->name ?: $entry->creator?->email),
                'entered_at' => optional($entry->entered_at)->toDateTimeString() ?: $entry->created_at?->toDateTimeString(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'string', 'max:100'],
            'sales_channel' => ['required', 'string', 'max:50'],
        ]);

        $entries = Settlement::query()
            ->with('creator:id,name,email')
            ->where(function ($query) use ($validated) {
                $query->where('order_ref_no', $validated['order_id'])
                    ->orWhereHas('order', function ($orderQuery) use ($validated) {
                        $orderQuery->where('ref_no', $validated['order_id']);
                    });
            })
            ->where('payment_gateway', $validated['sales_channel'])
            ->orderByDesc('settlement_date')
            ->orderByDesc('id')
            ->get();

        $mapped = $entries->map(function (Settlement $entry) {
            return [
                'id' => $entry->id,
                'ref_no' => $entry->transaction_no,
                'transaction_date' => optional($entry->settlement_date)->format('Y-m-d'),
                'amount' => (float) $entry->amount,
                'remarks' => $entry->notes,
                'settlement_type' => $entry->payment_mode,
                'entered_by' => $entry->entered_by ?: ($entry->creator?->name ?: $entry->creator?->email),
                'entered_at' => optional($entry->entered_at)->toDateTimeString() ?: $entry->created_at?->toDateTimeString(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => [
                'entries' => $mapped,
                'sum' => (float) $entries->sum('amount'),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ref_no' => ['required', 'string', 'max:100'],
            'transaction_date' => ['required', 'date'],
            'order_id' => ['required', 'string', 'max:100'],
            'sales_channel' => ['required', 'string', 'max:50'],
            'amount' => ['required', 'numeric'],
            'remarks' => ['nullable', 'string', 'max:500'],
            'settlement_type' => ['required', 'string', 'max:100'],
            'entered_by' => ['nullable', 'string', 'max:100'],
            'entered_at' => ['nullable', 'date'],
        ]);

        if (Settlement::query()->where('transaction_no', $validated['ref_no'])->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Duplicate settlement reference number. Please retry.',
            ], 422);
        }

        try {
            $settlement = Settlement::query()->create([
                'order_id' => null,
                'order_ref_no' => trim($validated['order_id']),
                'amount' => $validated['amount'],
                'transaction_no' => $validated['ref_no'],
                'payment_mode' => $validated['settlement_type'],
                'payment_gateway' => $validated['sales_channel'],
                'settlement_date' => $validated['transaction_date'],
                'status' => 'settled',
                'notes' => $validated['remarks'] ?? null,
                'created_by' => Auth::id(),
                'entered_by' => $validated['entered_by'] ?? Auth::user()?->name,
                'entered_at' => !empty($validated['entered_at'])
                    ? Carbon::parse($validated['entered_at'])
                    : now('Asia/Kolkata'),
            ]);
        } catch (QueryException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => 'Duplicate settlement reference number. Please refresh and try again.',
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Settlement entry saved.',
            'data' => [
                'id' => $settlement->id,
                'ref_no' => $settlement->transaction_no,
            ],
        ], 201);
    }

    private function generateUniqueRefNo(): string
    {
        $prefix = 'SET';

        do {
            $candidate = $prefix . now('Asia/Kolkata')->format('YmdHisv') . random_int(10, 99);
        } while (Settlement::query()->where('transaction_no', $candidate)->exists());

        return $candidate;
    }
}
