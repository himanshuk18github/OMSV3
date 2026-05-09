import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { apiRequest } from '../api';
import { Alert, Autocomplete, Button, Card, CardContent, Chip, Grid, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';

type Vendor = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  bank_name?: string | null;
  account_no?: string | null;
  ifsc?: string | null;
  contact_details?: unknown;
  is_active: boolean;
};

type PaginatedResponse = {
  status: string;
  data: {
    data: Vendor[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

type VendorForm = {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  bank_name: string;
  account_no: string;
  ifsc: string;
  is_active: boolean;
};

const emptyForm: VendorForm = {
  name: '',
  email: '',
  phone: '',
  gstin: '',
  pan: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  bank_name: '',
  account_no: '',
  ifsc: '',
  is_active: true,
};

const indianStates = [
  'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GOA', 'GUJARAT',
  'HARYANA', 'HIMACHAL PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA PRADESH',
  'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB',
  'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA', 'TRIPURA', 'UTTAR PRADESH',
  'UTTARAKHAND', 'WEST BENGAL', 'ANDAMAN AND NICOBAR ISLANDS', 'CHANDIGARH',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU', 'LAKSHADWEEP', 'DELHI', 'PUDUCHERRY',
  'LADAKH', 'JAMMU AND KASHMIR',
].sort((a, b) => a.localeCompare(b));

export default function VendorsPage() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role?.name?.toLowerCase() === 'admin';

  const [rows, setRows] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VendorForm>(emptyForm);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<PaginatedResponse>('/vendors?per_page=100');
      setRows(res.data.data || []);
    } catch (e: any) {
      setError(e?.message || 'Unable to load vendors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVendors();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      gstin: vendor.gstin || '',
      pan: vendor.pan || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      pincode: vendor.pincode || '',
      bank_name: vendor.bank_name || '',
      account_no: vendor.account_no || '',
      ifsc: vendor.ifsc || '',
      is_active: Boolean(vendor.is_active),
    });
    setSuccess('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!isAdmin) {
      return;
    }

    if (!form.name.trim()) {
      setError('Vendor name is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        name: form.name.trim().toUpperCase(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        gstin: form.gstin.trim() || null,
        pan: form.pan.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim().toUpperCase() || null,
        state: form.state.trim().toUpperCase() || null,
        pincode: form.pincode.trim() || null,
        bank_name: form.bank_name.trim() || null,
        account_no: form.account_no.trim() || null,
        ifsc: form.ifsc.trim().toUpperCase() || null,
        is_active: form.is_active,
      };

      if (editingId) {
        await apiRequest(`/vendors/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccess('Vendor updated successfully.');
      } else {
        await apiRequest('/vendors', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess('Vendor added successfully.');
      }

      resetForm();
      await loadVendors();
    } catch (e: any) {
      setError(e?.message || 'Unable to save vendor.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (vendor: Vendor) => {
    if (!isAdmin) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await apiRequest(`/vendors/${vendor.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !vendor.is_active }),
      });
      await loadVendors();
    } catch (e: any) {
      setError(e?.message || 'Unable to update vendor status.');
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((row) => row.is_active).length,
    inactive: rows.filter((row) => !row.is_active).length,
  }), [rows]);

  if (loading) return <div className="p-6">Loading vendors...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Manage Vendors</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Admins can add and update vendors. Everyone can view the vendor list.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs uppercase tracking-[0.16em] text-gray-500">Total</div>
              <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{stats.total}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs uppercase tracking-[0.16em] text-gray-500">Active</div>
              <div className="mt-1 text-lg font-semibold text-emerald-600">{stats.active}</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
              <div className="text-xs uppercase tracking-[0.16em] text-gray-500">Inactive</div>
              <div className="mt-1 text-lg font-semibold text-rose-600">{stats.inactive}</div>
            </div>
          </div>
        </div>
      </div>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {isAdmin ? (
        <Card className="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {editingId ? 'Edit Vendor' : 'Add Vendor'}
              </Typography>
              {editingId ? (
                <Button variant="text" startIcon={<RefreshIcon />} onClick={resetForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}><TextField fullWidth label="Name*" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="GSTIN" value={form.gstin} onChange={(e) => setForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="PAN" value={form.pan} onChange={(e) => setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Pincode" value={form.pincode} onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Address" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} multiline minRows={2} /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth label="City" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value.toUpperCase() }))} /></Grid>
              <Grid item xs={12} md={3}>
                <Autocomplete
                  options={indianStates}
                  value={form.state || null}
                  onChange={(_e, value) => setForm((prev) => ({ ...prev, state: (value || '').toUpperCase() }))}
                  renderInput={(params) => <TextField {...params} label="State" />}
                />
              </Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Bank Name" value={form.bank_name} onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="Account No" value={form.account_no} onChange={(e) => setForm((prev) => ({ ...prev, account_no: e.target.value }))} /></Grid>
              <Grid item xs={12} md={4}><TextField fullWidth label="IFSC" value={form.ifsc} onChange={(e) => setForm((prev) => ({ ...prev, ifsc: e.target.value.toUpperCase() }))} /></Grid>
              <Grid item xs={12} md={4}>
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Active Status*</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Only admins can change this</div>
                  </div>
                  <Switch checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
                </div>
              </Grid>
            </Grid>

            <div className="flex justify-end gap-3">
              <Button variant="outlined" onClick={resetForm} disabled={saving}>Reset</Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleSubmit} disabled={saving}>
                {editingId ? 'Update Vendor' : 'Add Vendor'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">You have view-only access. Vendor create and status changes are available to admin users only.</Alert>
      )}

      <Paper className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">State</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.state || '-'}</td>
                  <td className="px-4 py-3">
                    <Chip
                      size="small"
                      label={row.is_active ? 'ACTIVE' : 'INACTIVE'}
                      color={row.is_active ? 'success' : 'default'}
                      variant={row.is_active ? 'filled' : 'outlined'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleEdit(row)} disabled={!isAdmin}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color={row.is_active ? 'warning' : 'success'}
                        onClick={() => handleToggleActive(row)}
                        disabled={!isAdmin}
                      >
                        {row.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </Stack>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Paper>
    </div>
  );
}
