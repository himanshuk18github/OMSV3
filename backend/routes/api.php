<?php


use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\DispatchController;
use App\Http\Controllers\Api\FormulaConfigController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\ImportController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReportDefinitionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ReturnController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettlementController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\VendorController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — OMS v3.0
|--------------------------------------------------------------------------
*/

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('forgot-password/send-otp', [AuthController::class, 'sendForgotPasswordOtp']);
    Route::post('forgot-password/verify-otp', [AuthController::class, 'verifyForgotPasswordOtp']);
    Route::post('forgot-password/reset', [AuthController::class, 'resetForgotPassword']);
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('password', [AuthController::class, 'changePassword']);
    });

    // Orders
    Route::prefix('orders')->group(function () {
        Route::middleware('perm:dashboard,view')->get('dashboard-overview', [OrderController::class, 'dashboardOverview']);
        Route::middleware('perm:dashboard,view')->get('stats', [OrderController::class, 'stats']);
        Route::middleware('perm:sales_orders,view')->get('updates', [OrderController::class, 'updateOrdersList']);
        Route::middleware('perm:sales_orders,view')->get('updates/{refNo}', [OrderController::class, 'updateOrderDetails']);
        Route::middleware('perm:sales_orders,edit')->post('updates/{refNo}', [OrderController::class, 'submitUpdateOrder']);
        Route::middleware('perm:sales_orders,view')->get('confirmation', [OrderController::class, 'confirmationList']);
        Route::middleware('perm:sales_orders,view')->get('confirmation/{refNo}', [OrderController::class, 'confirmationDetails']);
        Route::middleware('perm:sales_orders,view')->get('confirmation/{refNo}/invoice', [OrderController::class, 'confirmationInvoice']);
        Route::middleware('perm:sales_orders,edit')->post('confirmation/{refNo}/submit', [OrderController::class, 'submitConfirmation']);
        Route::middleware('perm:sales_orders,view')->get('/', [OrderController::class, 'index']);
        Route::middleware('perm:sales_orders,edit')->post('/', [OrderController::class, 'store']);
        Route::middleware('perm:sales_orders,view')->get('{id}', [OrderController::class, 'show']);
        Route::middleware('perm:sales_orders,edit')->put('{id}', [OrderController::class, 'update']);
        Route::middleware('perm:sales_orders,edit')->delete('{id}', [OrderController::class, 'destroy']);

        Route::middleware('perm:import,edit')->post('import/preview', [OrderController::class, 'importPreview']);
        Route::middleware('perm:import,edit')->post('import', [OrderController::class, 'importBulk']);
    });

    Route::prefix('imports')->group(function () {
        Route::middleware('perm:import,edit')->post('preview', [ImportController::class, 'preview']);
        Route::middleware('perm:import,edit')->post('/', [ImportController::class, 'import']);
        Route::middleware('perm:import,view')->get('history', [ImportController::class, 'history']);
    });

    // Users
    Route::prefix('users')->group(function () {
        Route::middleware('perm:users,view')->get('/', [UserController::class, 'index']);
        Route::middleware('perm:users,edit')->post('/', [UserController::class, 'store']);
        Route::middleware('perm:users,edit')->put('{id}', [UserController::class, 'update']);
        Route::middleware('perm:users,edit')->put('roles/{id}/permissions', [UserController::class, 'updateRolePermissions']);
    });

    // Dispatches
    Route::prefix('dispatches')->group(function () {
        Route::middleware('perm:packages,edit')->post('upload-temp-invoice', [DispatchController::class, 'uploadTempInvoice']);
        Route::middleware('perm:packages,edit')->get('ref-no', [DispatchController::class, 'reserveRefNo']);
        Route::middleware('perm:packages,view')->get('sku-options', [DispatchController::class, 'skuOptions']);
        Route::middleware('perm:packages,view')->get('dashboard', [DispatchController::class, 'dashboardStats']);
        Route::middleware('perm:packages,view')->get('logs', [DispatchController::class, 'logs']);
        Route::middleware('perm:packages,view')->get('logs/{refNo}', [DispatchController::class, 'logDetails']);
        Route::middleware('perm:packages,edit')->post('/', [DispatchController::class, 'store']);
        Route::middleware('perm:packages,view')->get('{orderId}/invoice', [DispatchController::class, 'invoice']);
    });

    // Returns (RTO)
    Route::prefix('returns')->group(function () {
        Route::middleware('perm:returns,edit')->get('ref-no', [ReturnController::class, 'reserveRefNo']);
        Route::middleware('perm:returns,view')->get('sku-options', [ReturnController::class, 'skuOptions']);
        Route::middleware('perm:returns,view')->get('dashboard', [ReturnController::class, 'dashboardStats']);
        Route::middleware('perm:returns,view')->get('logs', [ReturnController::class, 'logs']);
        Route::middleware('perm:returns,view')->get('logs/{returnRefNo}', [ReturnController::class, 'logDetails']);
        Route::middleware('perm:returns,edit')->post('/', [ReturnController::class, 'store']);
    });

    // Vendors
    Route::prefix('vendors')->group(function () {
        Route::middleware('perm:vendors,view')->get('all', [VendorController::class, 'all']);
        Route::middleware('perm:vendors,view')->get('/', [VendorController::class, 'index']);
        Route::middleware('perm:vendors,edit')->post('/', [VendorController::class, 'store']);
        Route::middleware('perm:vendors,view')->get('{id}', [VendorController::class, 'show']);
        Route::middleware('perm:vendors,edit')->put('{id}', [VendorController::class, 'update']);
        Route::middleware('perm:vendors,edit')->delete('{id}', [VendorController::class, 'destroy']);
    });

    // Inventory
    Route::prefix('inventory')->group(function () {
        Route::middleware('perm:inventory,view')->get('/', [InventoryController::class, 'index']);
        Route::middleware('perm:inventory,view')->get('logs', [InventoryController::class, 'logs']);
        Route::middleware('perm:inventory,view')->get('closing-stock', [InventoryController::class, 'closingStock']);
        Route::middleware('perm:inventory,view')->get('availability', [InventoryController::class, 'availability']);
        Route::middleware('perm:inventory,edit')->post('items', [InventoryController::class, 'storeItem']);
        Route::middleware('perm:inventory,edit')->post('add-stock', [InventoryController::class, 'addStock']);
        Route::middleware('perm:inventory,edit')->post('adjust', [InventoryController::class, 'adjust']);
    });

    // Invoices
    Route::prefix('invoices')->group(function () {
        Route::middleware('perm:invoices,edit')->get('ref-no', [InvoiceController::class, 'reserveInvoiceNumber']);
        Route::middleware('perm:invoices,view')->get('products', [InvoiceController::class, 'products']);
        Route::middleware('perm:invoices,edit')->post('upload-temp-pdf', [InvoiceController::class, 'uploadTempPdf']);
        Route::middleware('perm:invoices,edit')->post('/', [InvoiceController::class, 'store']);
        Route::middleware('perm:invoices,view')->get('{invoiceNumber}/pdf', [InvoiceController::class, 'servePdf'])->where('invoiceNumber', '.*');
    });

    // Formula Configurations
    Route::prefix('formula-configs')->group(function () {
        Route::middleware('perm:formula_setup,view')->get('/', [FormulaConfigController::class, 'index']);
        Route::middleware('perm:formula_setup,edit')->post('invoice-gen-sequence', [FormulaConfigController::class, 'upsertInvoiceGenSequence']);
        Route::middleware('perm:formula_setup,edit')->put('invoice-gen-sequence/{versionId}', [FormulaConfigController::class, 'updateInvoiceGenSequence']);
    });

    // Documents
    Route::prefix('documents')->group(function () {
        Route::middleware('perm:documents,view')->get('next-ref', [DocumentController::class, 'nextRef']);
        Route::middleware('perm:documents,view')->get('/', [DocumentController::class, 'index']);
        Route::middleware('perm:documents,edit')->post('/', [DocumentController::class, 'store']);
        Route::middleware('perm:documents,view')->get('{id}/file', [DocumentController::class, 'show']);
    });

    // Settlements
    Route::prefix('settlements')->group(function () {
        Route::middleware('perm:settlements,edit')->get('ref-no', [SettlementController::class, 'reserveRefNo']);
        Route::middleware('perm:settlements,view')->get('check-ref', [SettlementController::class, 'checkRef']);
        Route::middleware('perm:settlements,view')->get('history', [SettlementController::class, 'history']);
        Route::middleware('perm:settlements,view')->get('/', [SettlementController::class, 'index']);
        Route::middleware('perm:settlements,edit')->post('/', [SettlementController::class, 'store']);
    });

    // Reports
    Route::prefix('reports')->group(function () {
        Route::middleware('perm:reports,view')->get('sales', [ReportController::class, 'sales']);
        Route::middleware('perm:reports,view')->get('top-products', [ReportController::class, 'topProducts']);
        Route::middleware('perm:reports,view')->get('/', [ReportDefinitionController::class, 'index']);
        Route::middleware('perm:reports,view')->get('{id}/run', [ReportDefinitionController::class, 'run']);
        Route::middleware('perm:reports,edit')->post('/', [ReportDefinitionController::class, 'store']);
        Route::middleware('perm:reports,edit')->put('{id}', [ReportDefinitionController::class, 'update']);
    });

    // Support Tickets
    Route::prefix('tickets')->group(function () {
        Route::middleware('perm:tickets,view')->get('/', [TicketController::class, 'index']);
        Route::middleware('perm:tickets,edit')->post('/', [TicketController::class, 'store']);
        Route::middleware('perm:tickets,view')->get('{id}', [TicketController::class, 'show']);
        Route::middleware('perm:tickets,edit')->put('{id}', [TicketController::class, 'update']);
        Route::middleware('perm:tickets,edit')->post('{id}/messages', [TicketController::class, 'addMessage']);
    });
});
