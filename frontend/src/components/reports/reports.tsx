import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ExcelJS from 'exceljs';
import { apiRequest } from '../../features/backend/api';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';

type FilterField = {
  key: string;
  label: string;
  type: 'date' | 'text' | 'select';
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  helperText?: string;
};

type ReportDefinition = {
  id: number;
  slug: string;
  name: string;
  sql_query?: string | null;
  filter_schema?: FilterField[];
  is_active: boolean;
};

type RunResponse = {
  status: string;
  data: {
    report: {
      id: number;
      slug: string;
      name: string;
      filter_schema: FilterField[];
    };
    rows: Array<Record<string, any>>;
    summary?: Array<Record<string, any>>;
    is_gst_r1?: boolean;
  };
};

type ReportTemplate = {
  key: string;
  label: string;
  description: string;
  sql: string;
  filterSchema: FilterField[];
};

const emptyEditForm = {
  slug: '',
  name: '',
  sql_query: '',
  is_active: true,
  filter_schema_text: '',
};

const defaultFilterSchemas: Record<string, FilterField[]> = {
  date_range: [
    { key: 'date_from', label: 'From Date', type: 'date', required: true },
    { key: 'date_to', label: 'To Date', type: 'date', required: true },
  ],
  customer_filters: [
    { key: 'date_from', label: 'From Date', type: 'date' },
    { key: 'date_to', label: 'To Date', type: 'date' },
    { key: 'state', label: 'State', type: 'text', helperText: 'Enter a specific state name.' },
    { key: 'customer_phone', label: 'Customer Phone', type: 'text' },
    { key: 'customer_email', label: 'Customer Email', type: 'text' },
    { key: 'custom_gstin', label: 'Customer GSTIN', type: 'text' },
    { key: 'product_id', label: 'Product ID', type: 'text' },
    { key: 'fixed_sku', label: 'Product SKU', type: 'text' },
  ],
};

const reportTemplates: ReportTemplate[] = [
  {
    key: 'orders_advanced',
    label: 'Orders Advanced',
    description: 'Orders with customer, GSTIN, state, channel, product id and SKU filters.',
    sql: `SELECT
  o.ref_no AS \`Order Ref\`,
  o.order_date AS \`Order Date\`,
  o.sales_channel AS \`Sales Channel\`,
  o.customer_name AS \`Customer Name\`,
  o.customer_phone AS \`Customer Phone\`,
  o.customer_email AS \`Customer Email\`,
  o.custom_gstin AS \`Customer GSTIN\`,
  o.state AS \`State\`,
  oi.fixed_sku AS \`Fixed SKU\`,
  i.product_id AS \`Product ID\`,
  i.product_name AS \`Product Name\`,
  o.total_amount AS \`Order Total\`,
  o.total_tax AS \`Order Tax\`,
  o.total_profit AS \`Order Profit\`
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN inventory i ON i.fixed_sku = oi.fixed_sku
WHERE
  (:date_from IS NULL OR o.order_date >= :date_from)
  AND (:date_to IS NULL OR o.order_date <= :date_to)
  AND (:custom_gstin IS NULL OR o.custom_gstin = :custom_gstin)
  AND (:state IS NULL OR o.state = :state)
  AND (:sales_channel IS NULL OR o.sales_channel = :sales_channel)
  AND (:customer_phone IS NULL OR o.customer_phone = :customer_phone)
  AND (:customer_email IS NULL OR o.customer_email = :customer_email)
  AND (:product_id IS NULL OR i.product_id = :product_id)
  AND (:fixed_sku IS NULL OR oi.fixed_sku = :fixed_sku)
ORDER BY o.order_date DESC`,
    filterSchema: defaultFilterSchemas.customer_filters,
  },
  {
    key: 'order_items_deep_dive',
    label: 'Order Items Deep Dive',
    description: 'Line-level analytics across quantity, tax, discounts, shipping, fees, and profit.',
    sql: `SELECT
  o.ref_no AS \`Order Ref\`,
  o.order_date AS \`Order Date\`,
  o.invoice_no AS \`Invoice No\`,
  o.invoice_date AS \`Invoice Date\`,
  o.sales_channel AS \`Sales Channel\`,
  o.customer_name AS \`Customer Name\`,
  o.state AS \`State\`,
  oi.id AS \`Order Item ID\`,
  oi.sku_scanned AS \`Scanned SKU\`,
  oi.fixed_sku AS \`Fixed SKU\`,
  i.product_id AS \`Product ID\`,
  i.product_name AS \`Product Name\`,
  oi.source_type AS \`Source Type\`,
  oi.vendor_name AS \`Vendor Name\`,
  oi.quantity AS \`Quantity\`,
  oi.cost_price AS \`Cost Price\`,
  oi.selling_price AS \`Selling Price\`,
  oi.gst_rate AS \`GST Rate\`,
  oi.gst_amount AS \`GST Amount\`,
  oi.discount AS \`Discount\`,
  oi.shipping_cost AS \`Shipping Cost\`,
  oi.marketplace_fee AS \`Marketplace Fee\`,
  oi.total_amount AS \`Line Total\`,
  oi.profit AS \`Line Profit\`
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
LEFT JOIN inventory i ON i.fixed_sku = oi.fixed_sku
WHERE
  (:date_from IS NULL OR o.order_date >= :date_from)
  AND (:date_to IS NULL OR o.order_date <= :date_to)
  AND (:sales_channel IS NULL OR o.sales_channel = :sales_channel)
  AND (:state IS NULL OR o.state = :state)
  AND (:source_type IS NULL OR oi.source_type = :source_type)
  AND (:product_id IS NULL OR i.product_id = :product_id)
  AND (:fixed_sku IS NULL OR oi.fixed_sku = :fixed_sku)
ORDER BY o.order_date DESC, oi.id DESC`,
    filterSchema: [
      { key: 'date_from', label: 'From Order Date', type: 'date' },
      { key: 'date_to', label: 'To Order Date', type: 'date' },
      { key: 'sales_channel', label: 'Sales Channel', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
      {
        key: 'source_type',
        label: 'Source Type',
        type: 'select',
        options: [
          { label: 'OWN', value: 'OWN' },
          { label: 'VENDOR', value: 'VENDOR' },
        ],
      },
      { key: 'product_id', label: 'Product ID', type: 'text' },
      { key: 'fixed_sku', label: 'Fixed SKU', type: 'text' },
    ],
  },
  {
    key: 'settlements_advanced',
    label: 'Settlements Advanced',
    description: 'Settlement-centric report with transaction and payment filters.',
    sql: `SELECT
  s.order_ref_no AS \`Order Ref\`,
  s.settlement_date AS \`Settlement Date\`,
  s.transaction_no AS \`Transaction No\`,
  s.payment_mode AS \`Payment Mode\`,
  s.payment_gateway AS \`Payment Gateway\`,
  s.amount AS \`Settlement Amount\`,
  s.status AS \`Settlement Status\`,
  o.customer_name AS \`Customer Name\`,
  o.custom_gstin AS \`Customer GSTIN\`,
  oi.fixed_sku AS \`Fixed SKU\`,
  i.product_id AS \`Product ID\`
FROM settlements s
LEFT JOIN orders o ON o.id = s.order_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN inventory i ON i.fixed_sku = oi.fixed_sku
WHERE
  (:date_from IS NULL OR s.settlement_date >= :date_from)
  AND (:date_to IS NULL OR s.settlement_date <= :date_to)
  AND (:transaction_no IS NULL OR s.transaction_no = :transaction_no)
  AND (:payment_mode IS NULL OR s.payment_mode = :payment_mode)
  AND (:payment_gateway IS NULL OR s.payment_gateway = :payment_gateway)
  AND (:settlement_status IS NULL OR s.status = :settlement_status)
  AND (:custom_gstin IS NULL OR o.custom_gstin = :custom_gstin)
  AND (:product_id IS NULL OR i.product_id = :product_id)
  AND (:fixed_sku IS NULL OR oi.fixed_sku = :fixed_sku)
ORDER BY s.settlement_date DESC`,
    filterSchema: [
      { key: 'date_from', label: 'From Settlement Date', type: 'date' },
      { key: 'date_to', label: 'To Settlement Date', type: 'date' },
      { key: 'transaction_no', label: 'Transaction No', type: 'text' },
      { key: 'payment_mode', label: 'Payment Mode', type: 'text' },
      { key: 'payment_gateway', label: 'Payment Gateway', type: 'text' },
      { key: 'settlement_status', label: 'Settlement Status', type: 'text' },
      { key: 'custom_gstin', label: 'GSTIN', type: 'text' },
      { key: 'product_id', label: 'Product ID', type: 'text' },
      { key: 'fixed_sku', label: 'Fixed SKU', type: 'text' },
    ],
  },
  {
    key: 'inventory_snapshot',
    label: 'Inventory Snapshot',
    description: 'Simple inventory list with category and SKU filters.',
    sql: `SELECT
  i.product_id AS \`Product ID\`,
  i.fixed_sku AS \`Fixed SKU\`,
  i.product_name AS \`Product Name\`,
  i.category AS \`Category\`,
  i.brand AS \`Brand\`,
  i.quantity AS \`Qty\`,
  i.cost_per_unit AS \`Cost\`,
  i.selling_price AS \`Selling\`,
  i.mrp AS \`MRP\`,
  i.gst_rate AS \`GST Rate\`
FROM inventory i
WHERE
  (:product_id IS NULL OR i.product_id = :product_id)
  AND (:fixed_sku IS NULL OR i.fixed_sku = :fixed_sku)
  AND (:category IS NULL OR i.category = :category)
ORDER BY i.product_name`,
    filterSchema: [
      { key: 'product_id', label: 'Product ID', type: 'text' },
      { key: 'fixed_sku', label: 'Fixed SKU', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
    ],
  },
  {
    key: 'date_range_summary',
    label: 'Date Range Summary',
    description: 'Basic aggregate report grouped by order date.',
    sql: `SELECT
  DATE(o.order_date) AS \`Date\`,
  COUNT(*) AS \`Total Orders\`,
  SUM(o.total_amount) AS \`Revenue\`,
  SUM(o.total_tax) AS \`Tax\`,
  SUM(o.total_profit) AS \`Profit\`
FROM orders o
WHERE
  (:date_from IS NULL OR o.order_date >= :date_from)
  AND (:date_to IS NULL OR o.order_date <= :date_to)
GROUP BY DATE(o.order_date)
ORDER BY DATE(o.order_date)`,
    filterSchema: defaultFilterSchemas.date_range,
  },
];

const parseFilterSchema = (value: string): FilterField[] => {
  if (!value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const prettifyKey = (value: string) => value.replace(/_/g, ' ');

const writeStyledSheet = (sheet: ExcelJS.Worksheet, rows: Array<Record<string, any>>) => {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  if (headers.length === 0) {
    return;
  }

  sheet.addRow(headers.map((header) => prettifyKey(header)));
  rows.forEach((row) => {
    sheet.addRow(headers.map((header) => row[header] ?? ''));
  });

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const rowRef = sheet.getRow(r);
    rowRef.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
  }

  headers.forEach((header, index) => {
    const displayHeader = prettifyKey(header);
    let maxWidth = displayHeader.length + 4;
    rows.forEach((row) => {
      const content = String(row[header] ?? '');
      maxWidth = Math.max(maxWidth, content.length + 2);
    });
    sheet.getColumn(index + 1).width = Math.min(Math.max(maxWidth, 12), 60);
  });
};

export default function ReportsPage() {
  const { user } = useContext(AuthContext) as any;
  const isAdmin = (user?.role?.name || '').toLowerCase() === 'admin';

  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportDefinition | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [runRows, setRunRows] = useState<Array<Record<string, any>>>([]);
  const [runSummary, setRunSummary] = useState<Array<Record<string, any>>>([]);
  const [isGstR1, setIsGstR1] = useState(false);
  const [gstR1TabValue, setGstR1TabValue] = useState<'summary' | 'detailed'>('summary');
  const [viewMode, setViewMode] = useState<'view' | 'download'>('view');
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiRequest<{ status: string; data: ReportDefinition[] }>('/reports');
      setReports(response.data || []);
    } catch (exception: any) {
      setError(exception?.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const openRunDialog = (report: ReportDefinition, mode: 'view' | 'download') => {
    setActiveReport(report);
    setViewMode(mode);
    const nextFilters: Record<string, string> = {};
    (report.filter_schema || []).forEach((field) => {
      nextFilters[field.key] = '';
    });
    setFilters(nextFilters);
    setRunRows([]);
    setRunDialogOpen(true);
  };

  const runReport = async () => {
    if (!activeReport) {
      return;
    }

    setRunning(true);
    setError('');
    setSuccess('');

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const response = await apiRequest<RunResponse>(`/reports/${activeReport.id}/run?${params.toString()}`);
      setRunRows(response.data.rows || []);

      if (response.data.is_gst_r1) {
        setIsGstR1(true);
        setRunSummary(response.data.summary || []);
        setGstR1TabValue('summary');
      } else {
        setIsGstR1(false);
        setRunSummary([]);
      }

      setSuccess(`Report ${activeReport.name} loaded successfully.`);

      if (viewMode === 'download') {
        const fileWorkbook = new ExcelJS.Workbook();

        if (response.data.is_gst_r1) {
          const summarySheet = fileWorkbook.addWorksheet('Summary');
          const detailedSheet = fileWorkbook.addWorksheet('Detailed');
          writeStyledSheet(summarySheet, response.data.summary || []);
          writeStyledSheet(detailedSheet, response.data.rows || []);
        } else {
          const sheetName = (activeReport.name || 'Report').slice(0, 31);
          const sheet = fileWorkbook.addWorksheet(sheetName);
          writeStyledSheet(sheet, response.data.rows || []);
        }

        const buffer = await fileWorkbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${activeReport.slug}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } catch (exception: any) {
      setError(exception?.message || 'Unable to run report.');
    } finally {
      setRunning(false);
    }
  };

  const openEditDialog = (report: ReportDefinition) => {
    setActiveReport(report);
    setEditForm({
      slug: report.slug,
      name: report.name,
      sql_query: report.sql_query || '',
      is_active: Boolean(report.is_active),
      filter_schema_text: JSON.stringify(report.filter_schema || [], null, 2),
    });
    setEditDialogOpen(true);
    setSelectedTemplateKey('');
  };

  const saveReport = async () => {
    if (!activeReport) {
      return;
    }

    const filterSchema = parseFilterSchema(editForm.filter_schema_text);
    if (editForm.filter_schema_text.trim() && filterSchema.length === 0) {
      setError('Filter schema must be valid JSON array.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        slug: editForm.slug.trim(),
        name: editForm.name.trim(),
        sql_query: editForm.sql_query,
        filter_schema: filterSchema,
        is_active: editForm.is_active,
      };

      const response = await apiRequest(`/reports/${activeReport.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccess('Report updated successfully.');
      setEditDialogOpen(false);
      setActiveReport(null);
      await loadReports();
      return response;
    } catch (exception: any) {
      setError(exception?.message || 'Unable to save report.');
    } finally {
      setSaving(false);
    }
  };

  const createNewReport = () => {
    setActiveReport({
      id: 0,
      slug: '',
      name: '',
      sql_query: '',
      filter_schema: [],
      is_active: true,
    });
    setEditForm(emptyEditForm);
    setEditDialogOpen(true);
    setSelectedTemplateKey('');
  };

  const applyTemplate = () => {
    const template = reportTemplates.find((item) => item.key === selectedTemplateKey);
    if (!template) {
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      sql_query: template.sql,
      filter_schema_text: JSON.stringify(template.filterSchema, null, 2),
    }));
  };

  const saveNewReport = async () => {
    const filterSchema = parseFilterSchema(editForm.filter_schema_text);
    if (editForm.filter_schema_text.trim() && filterSchema.length === 0) {
      setError('Filter schema must be valid JSON array.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({
          slug: editForm.slug.trim(),
          name: editForm.name.trim(),
          sql_query: editForm.sql_query,
          filter_schema: filterSchema,
          is_active: editForm.is_active,
        }),
      });

      setSuccess('Report created successfully.');
      setEditDialogOpen(false);
      setActiveReport(null);
      await loadReports();
    } catch (exception: any) {
      setError(exception?.message || 'Unable to create report.');
    } finally {
      setSaving(false);
    }
  };

  const tableColumns = useMemo(() => {
    const displayRows = isGstR1 && gstR1TabValue === 'summary' ? runSummary : runRows;
    if (!displayRows.length) {
      return [] as string[];
    }

    return Object.keys(displayRows[0]);
  }, [runRows, runSummary, isGstR1, gstR1TabValue]);

  if (loading) {
    return <div className="p-6">Loading reports...</div>;
  }

  const displayRows = isGstR1 && gstR1TabValue === 'summary' ? runSummary : runRows;
  const htmlPreviewRows = displayRows.map((row) => `<tr>${tableColumns.map((column) => `<td style="border:1px solid #ddd;padding:6px;">${String(row[column] ?? '')}</td>`).join('')}</tr>`).join('');
  const htmlPreview = `<!doctype html><html><head><meta charset="utf-8"><title>${activeReport?.name || 'Report'}</title><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th{background:#1f4e78;color:#fff}td,th{border:1px solid #ddd;padding:6px;text-align:left}</style></head><body><h2>${activeReport?.name || 'Report'}</h2><table><thead><tr>${tableColumns.map((column) => `<th>${prettifyKey(column)}</th>`).join('')}</tr></thead><tbody>${htmlPreviewRows}</tbody></table></body></html>`;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Reports</Typography>
            <Typography variant="body2" color="text.secondary">
              Active reports are stored in the database. Admin can edit report name, active state, filter schema, and SQL.
            </Typography>
          </Box>
          {isAdmin ? (
            <Button variant="contained" onClick={createNewReport}>New Report</Button>
          ) : null}
        </Stack>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

        <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No reports configured.</TableCell>
                </TableRow>
              ) : reports.map((report, index) => (
                <TableRow key={report.id} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{report.name}</TableCell>
                  <TableCell>{report.slug}</TableCell>
                  <TableCell>
                    <Chip size="small" label={report.is_active ? 'ACTIVE' : 'INACTIVE'} color={report.is_active ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" size="small" onClick={() => openRunDialog(report, 'view')} disabled={!report.is_active}>
                        View / Download
                      </Button>
                      <Button variant="outlined" size="small" onClick={() => openRunDialog(report, 'download')} disabled={!report.is_active}>
                        Download XLSX
                      </Button>
                      {isAdmin ? (
                        <Button variant="contained" size="small" onClick={() => openEditDialog(report)}>
                          Edit
                        </Button>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={runDialogOpen} onClose={() => setRunDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{activeReport?.name || 'Report'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mb: 2, mt: 1 }}>
            {(activeReport?.filter_schema || []).map((field) => {
              if (field.type === 'select') {
                return (
                  <TextField
                    key={field.key}
                    select
                    label={field.label}
                    value={filters[field.key] || ''}
                    onChange={(event) => setFilters((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    fullWidth
                    required={field.required}
                  >
                    {(field.options || []).map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                );
              }

              return (
                <TextField
                  key={field.key}
                  type={field.type}
                  label={field.label}
                  value={filters[field.key] || ''}
                  onChange={(event) => setFilters((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  fullWidth
                  required={field.required}
                  InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                />
              );
            })}
          </Stack>

          <Button variant="contained" onClick={runReport} disabled={running} sx={{ mb: 2 }}>
            {running ? 'Processing...' : (viewMode === 'download' ? 'Generate Download' : 'View Report')}
          </Button>

          <Divider sx={{ mb: 2 }} />

          {isGstR1 && (
            <Box sx={{ mb: 2 }}>
              <Tabs value={gstR1TabValue} onChange={(_event, newValue) => setGstR1TabValue(newValue as 'summary' | 'detailed')}>
                <Tab label="Summary" value="summary" />
                <Tab label="Detailed" value="detailed" />
              </Tabs>
            </Box>
          )}

          {viewMode === 'view' && runRows.length > 0 ? (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  const tab = window.open('', '_blank', 'noopener,noreferrer');
                  if (tab) {
                    tab.document.open();
                    tab.document.write(htmlPreview);
                    tab.document.close();
                  }
                }}
              >
                Open HTML View in New Tab
              </Button>
            </Box>
          ) : null}

          <TableContainer sx={{ maxHeight: 520, border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {tableColumns.length === 0 ? (
                    <TableCell>No rows yet</TableCell>
                  ) : tableColumns.map((column) => (
                    <TableCell key={column} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {prettifyKey(column)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {runRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(tableColumns.length, 1)} align="center">
                      View the report to view results.
                    </TableCell>
                  </TableRow>
                ) : (isGstR1 && gstR1TabValue === 'summary' ? runSummary : runRows).map((row, index) => (
                  <TableRow key={index} hover>
                    {tableColumns.map((column) => (
                      <TableCell key={`${index}-${column}`} sx={{ whiteSpace: 'nowrap' }}>
                        {String(row[column] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRunDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{activeReport?.id ? 'Edit Report' : 'Create Report'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                select
                label="Quick Template"
                value={selectedTemplateKey}
                onChange={(event) => setSelectedTemplateKey(event.target.value)}
                fullWidth
              >
                {reportTemplates.map((template) => (
                  <MenuItem key={template.key} value={template.key}>{template.label}</MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" onClick={applyTemplate} disabled={!selectedTemplateKey}>
                Apply Template
              </Button>
            </Stack>
            {selectedTemplateKey ? (
              <Typography variant="caption" color="text.secondary">
                {reportTemplates.find((template) => template.key === selectedTemplateKey)?.description}
              </Typography>
            ) : null}

            <TextField
              label="Slug"
              value={editForm.slug}
              onChange={(event) => setEditForm((prev) => ({ ...prev, slug: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Name"
              value={editForm.name}
              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="SQL Query"
              value={editForm.sql_query}
              onChange={(event) => setEditForm((prev) => ({ ...prev, sql_query: event.target.value }))}
              fullWidth
              multiline
              minRows={6}
            />
            <TextField
              label="Filter Schema JSON"
              value={editForm.filter_schema_text}
              onChange={(event) => setEditForm((prev) => ({ ...prev, filter_schema_text: event.target.value }))}
              fullWidth
              multiline
              minRows={4}
              helperText={JSON.stringify(defaultFilterSchemas.customer_filters, null, 2)}
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                checked={editForm.is_active}
                onChange={(event) => setEditForm((prev) => ({ ...prev, is_active: event.target.checked }))}
              />
              <Typography variant="body2">Active</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={activeReport?.id ? saveReport : saveNewReport}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
