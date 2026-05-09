<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function nextRef(): JsonResponse
    {
        $last = (string) (Document::query()->latest('id')->value('ref_no') ?? '00000');
        $next = (int) preg_replace('/\D+/', '', $last);

        return response()->json([
            'status' => 'success',
            'data' => [
                'ref_no' => str_pad((string) ($next + 1), 5, '0', STR_PAD_LEFT),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $docs = Document::query()
            ->with(['uploader:id,name,email'])
            ->latest('id')
            ->get()
            ->map(function (Document $doc) {
                return [
                    'id' => $doc->id,
                    'ref_no' => $doc->ref_no,
                    'doc_date' => optional($doc->doc_date)->toDateString(),
                    'original_file_name' => $doc->original_file_name,
                    'remarks' => $doc->remarks,
                    'uploaded_by' => $doc->uploader?->name ?? 'N/A',
                    'uploaded_at' => optional($doc->created_at)->toDateTimeString(),
                ];
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => $docs,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ref_no' => ['required', 'string', 'max:20', 'unique:documents,ref_no'],
            'doc_date' => ['required', 'date'],
            'remarks' => ['required', 'string', 'max:1000'],
            'document' => ['required', 'file', 'max:204800', 'mimes:pdf,png,jpg,jpeg,heic,mp4'],
        ]);

        $file = $validated['document'];
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $storedName = sprintf('%s_%s.%s', $validated['ref_no'], now()->format('YmdHisv'), $ext);
        $storagePath = $file->storeAs('documents/' . now()->format('Y/m'), $storedName, 'local');

        $record = Document::query()->create([
            'ref_no' => $validated['ref_no'],
            'doc_date' => $validated['doc_date'],
            'original_file_name' => (string) $file->getClientOriginalName(),
            'stored_file_name' => $storedName,
            'mime_type' => (string) $file->getClientMimeType(),
            'file_size' => (int) $file->getSize(),
            'storage_path' => $storagePath,
            'remarks' => trim((string) $validated['remarks']),
            'uploaded_by' => (int) $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $record->id,
                'ref_no' => $record->ref_no,
            ],
        ], 201);
    }

    public function show(Request $request, int $id)
    {
        $doc = Document::query()->findOrFail($id);
        if (!$doc->storage_path || !Storage::disk('local')->exists($doc->storage_path)) {
            abort(404, 'Document not found.');
        }

        return Storage::disk('local')->response($doc->storage_path, $doc->original_file_name, [
            'Cache-Control' => 'private, max-age=120',
            'X-Robots-Tag' => 'noindex, nofollow',
            'Content-Disposition' => 'inline; filename="' . addslashes($doc->original_file_name) . '"',
        ]);
    }
}
