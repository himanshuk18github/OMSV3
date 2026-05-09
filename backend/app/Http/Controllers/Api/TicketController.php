<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tickets = SupportTicket::with(['creator:id,name', 'assignee:id,name', 'adminReplier:id,name', 'order:id,ref_no', 'latestMessage.sender:id,name'])
            ->when($request->get('status'), fn($q, $v) => $q->where('status', $v))
            ->when($request->get('priority'), fn($q, $v) => $q->where('priority', $v))
            ->when(!Auth::user()->isAdmin(), fn($q) => $q->where('created_by', Auth::id()))
            ->latest()
            ->paginate((int) $request->get('per_page', 15));

        return response()->json(['status' => 'success', 'data' => $tickets]);
    }

    public function show(int $id): JsonResponse
    {
        $ticket = SupportTicket::with([
            'creator:id,name',
            'assignee:id,name',
            'adminReplier:id,name',
            'order:id,ref_no,customer_name',
            'messages' => fn($q) => $q->with('sender:id,name')->orderBy('created_at'),
        ])
            ->findOrFail($id);

        $user = Auth::user();
        if (!$user->isAdmin() && (int) $ticket->created_by !== (int) $user->id) {
            abort(403, 'Not allowed to view this ticket.');
        }

        return response()->json(['status' => 'success', 'data' => $ticket]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'nullable|exists:orders,id',
            'reference_no' => 'nullable|string|max:100',
            'subject' => 'required|string|max:300',
            'description' => 'required|string',
            'category' => 'required|in:issue_with_scanning,issue_in_report,issue_with_login,other,issue_with_updating_details',
        ]);

        $validated['priority'] = 'medium';

        $user = Auth::user();
        $ticket = DB::transaction(function () use ($validated, $user) {
            $ticket = SupportTicket::create(array_merge($validated, [
                'ticket_no' => SupportTicket::generateTicketNo(),
                'created_by' => $user->id,
            ]));

            SupportTicketMessage::create([
                'support_ticket_id' => $ticket->id,
                'sender_id' => $user->id,
                'sender_type' => $user->isAdmin() ? 'admin' : 'user',
                'message' => $validated['description'],
            ]);

            return $ticket;
        });

        return response()->json([
            'status' => 'success',
            'data' => $ticket->fresh(['creator:id,name', 'messages' => fn($q) => $q->with('sender:id,name')->orderBy('created_at')]),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless(Auth::user()?->isAdmin(), 403, 'Only admin can reply or close tickets.');

        $ticket = SupportTicket::findOrFail($id);

        $validated = $request->validate([
            'status' => 'sometimes|in:open,in_progress,resolved,closed',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
            'admin_reply' => 'nullable|string',
        ]);

        if (array_key_exists('admin_reply', $validated)) {
            $validated['admin_replied_by'] = (int) Auth::id();
            $validated['admin_replied_at'] = now();
        }

        if (isset($validated['status']) && $validated['status'] === 'resolved') {
            $validated['resolved_at'] = now();
        }

        if (isset($validated['status']) && $validated['status'] === 'closed') {
            $validated['resolved_at'] = now();
        }

        $ticket->update($validated);
        return response()->json([
            'status' => 'success',
            'data' => $ticket->fresh([
                'creator:id,name',
                'adminReplier:id,name',
                'messages' => fn($q) => $q->with('sender:id,name')->orderBy('created_at'),
            ]),
        ]);
    }

    public function addMessage(Request $request, int $id): JsonResponse
    {
        $ticket = SupportTicket::findOrFail($id);
        $user = Auth::user();

        if (!$user->isAdmin() && (int) $ticket->created_by !== (int) $user->id) {
            abort(403, 'Not allowed to reply on this ticket.');
        }

        if ($ticket->status === 'closed') {
            return response()->json([
                'status' => 'error',
                'message' => 'Ticket is closed. Reopen to add a reply.',
            ], 422);
        }

        $validated = $request->validate([
            'message' => 'required|string',
            'status' => 'nullable|in:open,in_progress,resolved,closed',
        ]);

        DB::transaction(function () use ($ticket, $validated, $user) {
            SupportTicketMessage::create([
                'support_ticket_id' => $ticket->id,
                'sender_id' => $user->id,
                'sender_type' => $user->isAdmin() ? 'admin' : 'user',
                'message' => $validated['message'],
            ]);

            $updates = [];
            if ($user->isAdmin()) {
                $updates['admin_reply'] = $validated['message'];
                $updates['admin_replied_by'] = $user->id;
                $updates['admin_replied_at'] = now();

                if (!empty($validated['status'])) {
                    $updates['status'] = $validated['status'];
                    if (in_array($validated['status'], ['resolved', 'closed'], true)) {
                        $updates['resolved_at'] = now();
                    }
                    if ($validated['status'] === 'open' || $validated['status'] === 'in_progress') {
                        $updates['resolved_at'] = null;
                    }
                }
            }

            if (!empty($updates)) {
                $ticket->update($updates);
            }
        });

        return response()->json([
            'status' => 'success',
            'data' => $ticket->fresh([
                'creator:id,name',
                'adminReplier:id,name',
                'messages' => fn($q) => $q->with('sender:id,name')->orderBy('created_at'),
            ]),
        ]);
    }
}
