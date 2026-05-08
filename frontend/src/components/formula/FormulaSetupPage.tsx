import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { apiRequest } from '../../features/backend/api';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

type FormulaVersion = {
  id: number;
  version_no: number;
  effective_from: string;
  effective_to?: string | null;
  formula_template: string;
  change_note?: string | null;
  is_active: boolean;
  created_at?: string;
};

type FormulaConfig = {
  id: number;
  formula_name: string;
  display_name: string;
  description?: string | null;
  active_template?: string | null;
  active_effective_from?: string | null;
  versions: FormulaVersion[];
};

type FormulaListResponse = {
  status: string;
  data: FormulaConfig[];
};

const todayIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildFormulaPreview = (template: string, sampleSequence = 1) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const monthNum = now.getMonth() + 1;
  const fyStartYear = monthNum >= 4 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  let output = String(template || '');
  output = output.replace(/\{\{year4\}\}/g, String(year));
  output = output.replace(/\{\{year2\}\}/g, String(year).slice(-2));
  output = output.replace(/\{\{month2\}\}/g, month);
  output = output.replace(/\{\{day2\}\}/g, day);
  output = output.replace(/\{\{fy_start4\}\}/g, String(fyStartYear));
  output = output.replace(/\{\{fy_start2\}\}/g, String(fyStartYear % 100).padStart(2, '0'));
  output = output.replace(/\{\{fy_end2\}\}/g, String(fyEndYear % 100).padStart(2, '0'));

  output = output.replace(/\{\{seq(\d+)\}\}/g, (_match, padRaw) => {
    const pad = Math.max(1, Number(padRaw || 1));
    return String(sampleSequence).padStart(pad, '0');
  });

  return output;
};

export default function FormulaSetupPage() {
  const { user } = useContext(AuthContext) as any;
  const isAdmin = user?.role?.name?.toLowerCase() === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState<FormulaConfig | null>(null);
  const [editingVersionId, setEditingVersionId] = useState<number | null>(null);

  const [formulaTemplate, setFormulaTemplate] = useState('AS/{{fy_start4}}-{{fy_end2}}/{{month2}}/{{seq1}}');
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [changeNote, setChangeNote] = useState('');
  const previewValue = buildFormulaPreview(formulaTemplate, 1);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiRequest<FormulaListResponse>('/formula-configs');
      const invoiceFormula = (res.data || []).find((row) => row.formula_name === 'invoice_gen_sequence') || null;
      setConfig(invoiceFormula);

      if (invoiceFormula?.active_template) {
        setFormulaTemplate(invoiceFormula.active_template);
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to load formula setup.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfigs();
  }, []);

  const saveFormula = async () => {
    setError('');
    setSuccess('');

    if (!formulaTemplate.trim()) {
      setError('Formula template is required.');
      return;
    }

    if (!/\{\{seq\d+\}\}/.test(formulaTemplate)) {
      setError('Formula template must include a sequence placeholder like {{seq2}}.');
      return;
    }

    if (!effectiveFrom) {
      setError('Effective from date is required.');
      return;
    }

    try {
      setSaving(true);
      const targetPath = editingVersionId
        ? `/formula-configs/invoice-gen-sequence/${editingVersionId}`
        : '/formula-configs/invoice-gen-sequence';
      const method = editingVersionId ? 'PUT' : 'POST';

      const res = await apiRequest<{ status: string; message?: string }>(targetPath, {
        method,
        body: JSON.stringify({
          formula_template: formulaTemplate.trim(),
          effective_from: effectiveFrom,
          change_note: changeNote.trim(),
        }),
      });

      setSuccess(res.message || (editingVersionId ? 'Formula updated successfully.' : 'Formula saved successfully.'));
      setChangeNote('');
      setEditingVersionId(null);
      await loadConfigs();
    } catch (e: any) {
      setError(e?.message || 'Unable to save formula.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row: FormulaVersion) => {
    setEditingVersionId(row.id);
    setFormulaTemplate(row.formula_template);
    setEffectiveFrom(row.effective_from);
    setChangeNote(row.change_note || '');
    setError('');
    setSuccess('');
  };

  const resetForm = () => {
    setEditingVersionId(null);
    setFormulaTemplate(config?.active_template || 'AS/{{fy_start4}}-{{fy_end2}}/{{month2}}/{{seq1}}');
    setEffectiveFrom(todayIso());
    setChangeNote('');
    setError('');
    setSuccess('');
  };

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>
        Formula Setup
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage enterprise formulas with effective date history. Current implementation controls invoice generator sequence format.
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}
      {!isAdmin ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Only admin users can add or update formula versions.
        </Alert>
      ) : null}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            {editingVersionId ? 'Edit Invoice Generator Sequence Version' : 'Invoice Generator Sequence'}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                label="Formula Template"
                value={formulaTemplate}
                onChange={(e) => setFormulaTemplate(e.target.value)}
                disabled={!isAdmin}
                fullWidth
                helperText="Use placeholders: {{year4}}, {{year2}}, {{month2}}, {{day2}}, {{fy_start4}}, {{fy_start2}}, {{fy_end2}}, and required {{seqN}}"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                type="date"
                label="Effective From"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                disabled={!isAdmin}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box
                sx={{
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1.5,
                  bgcolor: 'background.default',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Live Preview</Typography>
                  <Chip size="small" label="Sample seq = 1" />
                </Stack>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {previewValue || '-'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Change Note"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                disabled={!isAdmin}
                fullWidth
                multiline
                minRows={2}
                placeholder="Example: switch to monthly sequence prefix"
              />
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
            {editingVersionId ? (
              <Button variant="outlined" onClick={resetForm} disabled={saving}>
                Cancel Edit
              </Button>
            ) : null}
            <Button variant="contained" onClick={saveFormula} disabled={!isAdmin || saving || loading}>
              {saving ? 'Saving...' : editingVersionId ? 'Update Formula Version' : 'Save Formula Version'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={700}>Version History</Typography>
          <Typography variant="body2" color="text.secondary">
            Duplicate effective dates are blocked to preserve non-overlapping sequence configuration.
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Version</TableCell>
                <TableCell>Effective From</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Note</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(config?.versions || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.version_no}</TableCell>
                  <TableCell>{row.effective_from}</TableCell>
                  <TableCell>{row.formula_template}</TableCell>
                  <TableCell>{row.change_note || '-'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="text" onClick={() => handleEdit(row)} disabled={!isAdmin}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && (!config || (config.versions || []).length === 0) ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No versions found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
