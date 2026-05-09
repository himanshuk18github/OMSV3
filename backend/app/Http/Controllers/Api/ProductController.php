<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(private ProductService $productService) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'type', 'category', 'is_active']);
        $perPage = (int) $request->get('per_page', 15);
        $products = $this->productService->list($filters, $perPage);
        return response()->json(['status' => 'success', 'data' => $products]);
    }

    public function all(): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->productService->all()]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->productService->show($id)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'required|string|max:100|unique:products,sku',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:20',
            'mrp' => 'required|numeric|min:0',
            'cost_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'gst_rate' => 'nullable|numeric|min:0|max:100',
            'type' => 'required|in:OWN,VENDOR',
            'hsn_code' => 'nullable|string|max:20',
            'is_active' => 'boolean',
        ]);

        $product = $this->productService->create($validated);
        return response()->json(['status' => 'success', 'data' => $product], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'sku' => "sometimes|string|max:100|unique:products,sku,{$id}",
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:20',
            'mrp' => 'sometimes|numeric|min:0',
            'cost_price' => 'sometimes|numeric|min:0',
            'selling_price' => 'sometimes|numeric|min:0',
            'gst_rate' => 'nullable|numeric|min:0|max:100',
            'type' => 'sometimes|in:OWN,VENDOR',
            'hsn_code' => 'nullable|string|max:20',
            'is_active' => 'boolean',
        ]);

        return response()->json(['status' => 'success', 'data' => $this->productService->update($id, $validated)]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->productService->delete($id);
        return response()->json(['status' => 'success', 'message' => 'Product deleted.']);
    }
}
