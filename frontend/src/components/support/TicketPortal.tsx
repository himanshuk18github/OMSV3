import { useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';
import { apiRequest } from '../../features/backend/api';

type TicketMessage = {
  id: number;
  sender_id: number;
  sender_type: 'admin' | 'user';
  message: string;
  created_at: string;
  sender?: { id: number; name: string };
};

type TicketRow = {
  id: number;
  ticket_no: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category?: string | null;
  reference_no?: string | null;
  admin_reply?: string | null;
  created_at?: string;
  creator?: { id: number; name: string };
  messages?: TicketMessage[];
};

type TicketListResponse = {
  status: string;
  data: {
    data: TicketRow[];
  };
};

type TicketDetailResponse = {
  status: string;
  data: TicketRow;
};

const ticketCategories = [
  { value: 'issue_with_scanning', label: 'Issue with Scanning' },
  { value: 'issue_in_report', label: 'Issue in Report' },
  { value: 'issue_with_login', label: 'Issue with Login' },
  { value: 'other', label: 'Other' },
  { value: 'issue_with_updating_details', label: 'Issue with Updating Details' },
];

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TicketPortal() {
  const { user } = useContext(AuthContext) as any;
  const isAdmin = (user?.role?.name || '').toLowerCase() === 'admin';

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('issue_with_scanning');
  const [referenceNo, setReferenceNo] = useState('');

  const [chatOpen, setChatOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<TicketRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [adminNextStatus, setAdminNextStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('in_progress');

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest<TicketListResponse>('/tickets?per_page=100');
      setTickets(res?.data?.data || []);
    } catch (e: any) {
      setError(e?.message || 'Unable to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (ticketId: number) => {
    const res = await apiRequest<TicketDetailResponse>(`/tickets/${ticketId}`);
    setActiveTicket(res.data);
    setAdminNextStatus((res.data.status === 'closed' ? 'closed' : 'in_progress') as 'open' | 'in_progress' | 'resolved' | 'closed');
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const createTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          category,
          reference_no: referenceNo.trim() || null,
        }),
      });

      setSuccess('Ticket created successfully.');
      setSubject('');
      setDescription('');
      setCategory('issue_with_scanning');
      setReferenceNo('');
      await loadTickets();
    } catch (e: any) {
      setError(e?.message || 'Unable to create ticket.');
    } finally {
      setSaving(false);
    }
  };

  const openChat = async (ticket: TicketRow) => {
    try {
      setError('');
      setChatOpen(true);
      await loadTicketDetail(ticket.id);
    } catch (e: any) {
      setError(e?.message || 'Unable to open ticket conversation.');
      setChatOpen(false);
    }
  };

  const sendReply = async () => {
    if (!activeTicket) {
      return;
    }

    if (activeTicket.status === 'closed') {
      setError('This ticket is closed.');
      return;
    }

    if (!replyText.trim()) {
      setError('Please type a message.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await apiRequest(`/tickets/${activeTicket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message: replyText.trim(),
          status: isAdmin ? adminNextStatus : undefined,
        }),
      });

      setReplyText('');
      await loadTicketDetail(activeTicket.id);
      await loadTickets();
    } catch (e: any) {
      setError(e?.message || 'Unable to send reply.');
    } finally {
      setSaving(false);
    }
  };

  const closeOrReopenByAdmin = async (nextStatus: 'open' | 'closed') => {
    if (!activeTicket || !isAdmin) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await apiRequest(`/tickets/${activeTicket.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadTicketDetail(activeTicket.id);
      await loadTickets();
    } catch (e: any) {
      setError(e?.message || 'Unable to update ticket status.');
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((row) => row.status !== 'closed').length,
      closed: tickets.filter((row) => row.status === 'closed').length,
    };
  }, [tickets]);

  const activeMessages: TicketMessage[] = useMemo(() => {
    if (!activeTicket) {
      return [];
    }

    if ((activeTicket.messages || []).length > 0) {
      return activeTicket.messages || [];
    }

    if (!activeTicket.description) {
      return [];
    }

    return [
      {
        id: -1,
        sender_id: activeTicket.creator?.id || 0,
        sender_type: 'user',
        message: activeTicket.description,
        created_at: activeTicket.created_at || new Date().toISOString(),
        sender: activeTicket.creator,
      },
    ];
  }, [activeTicket]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Ticket Support</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Raised Ticket with Admin for any issues.
        </p>
      </div>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card><CardContent><Typography variant="h6">Total</Typography><Typography variant="h4">{stats.total}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent><Typography variant="h6">Open</Typography><Typography variant="h4">{stats.open}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent><Typography variant="h6">Closed</Typography><Typography variant="h4">{stats.closed}</Typography></CardContent></Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent className="space-y-3">
          <Typography variant="h6" fontWeight={700}>Create Ticket</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {ticketCategories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Reference No (Optional)" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={12}>
              <TextField fullWidth multiline minRows={3} label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={createTicket} disabled={saving}>Create Ticket</Button>
          </Box>
        </CardContent>
      </Card>

      <Paper className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">Ticket No</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-3" colSpan={7}>Loading...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td className="px-4 py-3" colSpan={7}>No tickets found.</td></tr>
              ) : tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-gray-100 dark:border-gray-800 align-top">
                  <td className="px-4 py-3">{ticket.ticket_no}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{ticket.subject}</div>
                    <div className="text-xs text-gray-500">{ticket.description}</div>
                  </td>
                  <td className="px-4 py-3">{ticket.category || '-'}</td>
                  <td className="px-4 py-3">{ticket.reference_no || '-'}</td>
                  <td className="px-4 py-3">
                    <Chip size="small" label={ticket.status.toUpperCase()} color={ticket.status === 'closed' ? 'default' : 'primary'} />
                  </td>
                  <td className="px-4 py-3">{formatDateTime(ticket.created_at)}</td>
                  <td className="px-4 py-3">
                    <Button size="small" variant="outlined" onClick={() => openChat(ticket)}>Open Chat</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Paper>

      <Dialog open={chatOpen} onClose={() => setChatOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <div>
              <Typography variant="h6">{activeTicket?.ticket_no || 'Ticket'}</Typography>
              <Typography variant="body2" color="text.secondary">{activeTicket?.subject || ''}</Typography>
            </div>
            <Chip
              size="small"
              label={(activeTicket?.status || 'open').toUpperCase()}
              color={activeTicket?.status === 'closed' ? 'default' : 'primary'}
            />
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ height: 360, overflowY: 'auto', p: 1, bgcolor: '#f5f7fb', borderRadius: 2 }}>
            <Stack spacing={1.5}>
              {activeMessages.map((message) => {
                const mine = Number(message.sender_id) === Number(user?.id);
                const bubbleColor = mine ? '#d9fdd3' : '#ffffff';

                return (
                  <Box key={message.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <Box
                      sx={{
                        maxWidth: '78%',
                        bgcolor: bubbleColor,
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                        {message.sender?.name || (message.sender_type === 'admin' ? 'Admin' : 'User')}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.message}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                        {formatDateTime(message.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}

              {activeMessages.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No conversation yet.</Typography>
              ) : null}
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          {isAdmin ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                select
                size="small"
                label="Next Status"
                value={adminNextStatus}
                onChange={(e) => setAdminNextStatus(e.target.value as 'open' | 'in_progress' | 'resolved' | 'closed')}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="open">OPEN</MenuItem>
                <MenuItem value="in_progress">IN PROGRESS</MenuItem>
                <MenuItem value="resolved">RESOLVED</MenuItem>
                <MenuItem value="closed">CLOSED</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" color="warning" disabled={saving || activeTicket?.status === 'closed'} onClick={() => closeOrReopenByAdmin('closed')}>
                  Close Now
                </Button>
                <Button variant="outlined" disabled={saving || activeTicket?.status !== 'closed'} onClick={() => closeOrReopenByAdmin('open')}>
                  Reopen
                </Button>
              </Stack>
            </Stack>
          ) : null}

          <TextField
            fullWidth
            multiline
            minRows={3}
            label={activeTicket?.status === 'closed' ? 'Ticket closed: cannot reply' : 'Type your reply'}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={activeTicket?.status === 'closed' || saving}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setChatOpen(false)}>Close</Button>
          <Button variant="contained" onClick={sendReply} disabled={saving || !replyText.trim() || activeTicket?.status === 'closed'}>
            Send Reply
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
