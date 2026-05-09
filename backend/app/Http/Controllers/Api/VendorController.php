<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Repositories\VendorRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function __construct(private VendorRepository $vendorRepository) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'is_active']);
        $vendors = $this->vendorRepository->paginate($filters, (int) $request->get('per_page', 15));
        return response()->json(['status' => 'success', 'data' => $vendors]);
    }

    public function all(): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->vendorRepository->getAll()]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->vendorRepository->findById($id)]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage vendors.');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:150',
            'phone' => 'nullable|string|max:20',
            'gstin' => 'nullable|string|max:20',
            'pan' => 'nullable|string|max:15',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:10',
            'bank_name' => 'nullable|string|max:200',
            'account_no' => 'nullable|string|max:30',
            'ifsc' => 'nullable|string|max:15',
            'contact_details' => 'nullable|array',
            'is_active' => 'required|boolean',
        ]);

        $validated['name'] = mb_strtoupper(trim((string) $validated['name']));

        $vendor = $this->vendorRepository->create($validated);
        return response()->json(['status' => 'success', 'data' => $vendor], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage vendors.');

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:150',
            'phone' => 'nullable|string|max:20',
            'gstin' => 'nullable|string|max:20',
            'pan' => 'nullable|string|max:15',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:10',
            'bank_name' => 'nullable|string|max:200',
            'account_no' => 'nullable|string|max:30',
            'ifsc' => 'nullable|string|max:15',
            'contact_details' => 'nullable|array',
            'is_active' => 'required|boolean',
        ]);

        if (isset($validated['name'])) {
            $validated['name'] = mb_strtoupper(trim((string) $validated['name']));
        }

        return response()->json(['status' => 'success', 'data' => $this->vendorRepository->update($id, $validated)]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Only admin can manage vendors.');

        $this->vendorRepository->delete($id);
        return response()->json(['status' => 'success', 'message' => 'Vendor deleted.']);
    }
}
