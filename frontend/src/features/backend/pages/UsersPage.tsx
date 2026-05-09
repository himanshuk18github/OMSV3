import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { apiRequest } from '../api';
import {
  Alert,
  Checkbox,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';

type RoleOption = {
  id: number;
  name: string;
  display_name: string;
  description?: string | null;
  permissions?: Record<string, { view: boolean; edit: boolean }>;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  role_id?: number | null;
  role_name?: string | null;
  role_display_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiResponse = {
  status: string;
  data: {
    users: UserRow[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
    roles: RoleOption[];
    permission_catalog?: Record<string, string>;
  };
};

type UserForm = {
  name: string;
  email: string;
  phone: string;
  role_id: number | '';
  is_active: boolean;
  password: string;
  password_confirmation: string;
};

const emptyForm: UserForm = {
  name: '',
  email: '',
  phone: '',
  role_id: '',
  is_active: true,
  password: '',
  password_confirmation: '',
};

export default function UsersPage() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role?.name?.toLowerCase() === 'admin';

  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [permissionCatalog, setPermissionCatalog] = useState<Record<string, string>>({});
  const [rolePermissionDraft, setRolePermissionDraft] = useState<Record<number, Record<string, { view: boolean; edit: boolean }>>>({});
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [openAccessDialog, setOpenAccessDialog] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<ApiResponse>('/users?per_page=100');
      setRows(res.data.users || []);
      setRoles(res.data.roles || []);
      setPermissionCatalog(res.data.permission_catalog || {});

      const drafts: Record<number, Record<string, { view: boolean; edit: boolean }>> = {};
      (res.data.roles || []).forEach((role) => {
        drafts[role.id] = role.permissions || {};
      });
      setRolePermissionDraft(drafts);
    } catch (e: any) {
      setError(e?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (row: UserRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      role_id: row.role_id || '',
      is_active: Boolean(row.is_active),
      password: '',
      password_confirmation: '',
    });
    setShowForm(true);
    setSuccess('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!isAdmin) {
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.role_id) {
      setError('Name, email, and role are required.');
      return;
    }

    if (!editingId && !form.password.trim()) {
      setError('Password is required for new users.');
      return;
    }

    if (form.password.trim() && form.password.trim() !== form.password_confirmation.trim()) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        role_id: form.role_id,
        is_active: form.is_active,
      };

      if (form.password.trim()) {
        payload.password = form.password;
        payload.password_confirmation = form.password_confirmation;
      }

      if (editingId) {
        await apiRequest(`/users/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccess('User updated successfully.');
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess('User created successfully.');
      }

      resetForm();
      setShowForm(false);
      await loadUsers();
    } catch (e: any) {
      setError(e?.message || 'Unable to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row: UserRow) => {
    if (!isAdmin) {
      return;
    }

    if (row.id === user?.id && row.is_active) {
      setError('You cannot deactivate your own account.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await apiRequest(`/users/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      await loadUsers();
    } catch (e: any) {
      setError(e?.message || 'Unable to update user status.');
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((row) => row.is_active).length,
    inactive: rows.filter((row) => !row.is_active).length,
  }), [rows]);

  const rolePermissionKeys = useMemo(() => Object.keys(permissionCatalog || {}), [permissionCatalog]);
  const editableRoles = useMemo(() => roles.filter((role) => role.name?.toLowerCase() !== 'admin'), [roles]);

  const updateRolePermissionValue = (roleId: number, key: string, mode: 'view' | 'edit', checked: boolean) => {
    setRolePermissionDraft((prev) => {
      const roleDraft = { ...(prev[roleId] || {}) };
      const current = roleDraft[key] || { view: false, edit: false };

      const nextValue = {
        ...current,
        [mode]: checked,
      };

      if (mode === 'edit' && checked) {
        nextValue.view = true;
      }

      if (mode === 'view' && !checked) {
        nextValue.edit = false;
      }

      roleDraft[key] = nextValue;
      return {
        ...prev,
        [roleId]: roleDraft,
      };
    });
  };

  const saveRolePermissions = async (role: RoleOption) => {
    if (!isAdmin) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await apiRequest(`/users/roles/${role.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          permissions: rolePermissionDraft[role.id] || {},
        }),
      });

      setSuccess(`Permissions updated for ${role.display_name}.`);
      await loadUsers();
    } catch (e: any) {
      setError(e?.message || 'Unable to update role permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Users</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View all system users with roles, and manage login access from one place.
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
                {editingId ? 'Edit User' : 'Add New User'}
              </Typography>
              <div className="flex gap-2">
                {!showForm ? (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
                    Add User
                  </Button>
                ) : null}
                {editingId || showForm ? (
                  <Button variant="text" startIcon={<RefreshIcon />} onClick={() => { resetForm(); setShowForm(false); }}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>

            {showForm ? (
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Name*" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Email*" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Role*"
                    value={form.role_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, role_id: Number(e.target.value) }))}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.display_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={editingId ? 'New Password' : 'Password*'}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    helperText={editingId ? 'Leave blank to keep current password.' : ''}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label={editingId ? 'Confirm New Password' : 'Confirm Password*'}
                    type="password"
                    value={form.password_confirmation}
                    onChange={(e) => setForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
                  />
                </Grid>
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
            ) : null}

            {showForm ? (
              <div className="flex justify-end gap-3">
                <Button variant="outlined" onClick={() => { resetForm(); setShowForm(false); }} disabled={saving}>Reset</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                  {editingId ? 'Update User' : 'Save User'}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">You have view-only access. Only admins can add or change users.</Alert>
      )}

      <Paper className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.role_display_name || row.role_name || '-'}</td>
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
                        disabled={!isAdmin || (row.id === user?.id && row.is_active)}
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

      {isAdmin ? (
        <Card className="rounded-3xl border border-gray-200 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="space-y-4">
            <Typography variant="h6" fontWeight={700} color="text.primary">
              Role Access Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select a role (except Admin), then click Edit Access to configure module view/edit rights.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                select
                size="small"
                label="Select Role"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                sx={{ minWidth: 280 }}
              >
                {editableRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>{role.display_name}</MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                onClick={() => selectedRoleId && setOpenAccessDialog(true)}
                disabled={!selectedRoleId}
              >
                Edit Access
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={openAccessDialog} onClose={() => setOpenAccessDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Role Access</DialogTitle>
        <DialogContent dividers>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">Module</th>
                  <th className="px-3 py-2 text-left">View</th>
                  <th className="px-3 py-2 text-left">Edit</th>
                </tr>
              </thead>
              <tbody>
                {rolePermissionKeys.map((key) => {
                  const label = permissionCatalog[key] || key;
                  const roleId = Number(selectedRoleId);
                  const val = rolePermissionDraft?.[roleId]?.[key] || { view: false, edit: false };
                  return (
                    <tr key={`${roleId}-${key}`} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2">{label}</td>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={Boolean(val.view)}
                          onChange={(e) => updateRolePermissionValue(roleId, key, 'view', e.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={Boolean(val.edit)}
                          onChange={(e) => updateRolePermissionValue(roleId, key, 'edit', e.target.checked)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAccessDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!selectedRoleId || saving}
            onClick={async () => {
              const selected = editableRoles.find((r) => r.id === Number(selectedRoleId));
              if (!selected) {
                return;
              }
              await saveRolePermissions(selected);
              setOpenAccessDialog(false);
            }}
          >
            Save Access
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
