<?php

namespace App\Services;

use App\Models\Product;
use App\Repositories\ProductRepository;

class ProductService
{
    public function __construct(private ProductRepository $productRepository) {}

    public function list(array $filters, int $perPage = 15)
    {
        return $this->productRepository->paginate($filters, $perPage);
    }

    public function show(int $id): Product
    {
        return $this->productRepository->findById($id);
    }

    public function create(array $data): Product
    {
        return $this->productRepository->create($data);
    }

    public function update(int $id, array $data): Product
    {
        return $this->productRepository->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->productRepository->delete($id);
    }

    public function all(): \Illuminate\Database\Eloquent\Collection
    {
        return $this->productRepository->getAll();
    }
}
