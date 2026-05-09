import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { apiRequest } from '../../features/backend/api';

type ImportType = 'inventory' | 'inventory_logs' | 'orders' | 'order_items' | 'rto_packages' | 'settlements';

type ImportDefinition = {
  type: ImportType;
  label: string;
  description: string;
  columns: string[];
  sampleRow: Record<string, string | number | null>;
  note?: string;
};

type PreviewResponse = {
  status: string;
  data: {
    type: ImportType;
    rows: Array<Record<string, any>>;
    row_errors: Record<string, string[]>;
    has_errors: boolean;
  };
};

type ImportHistoryRow = {
  id: number;
  import_type: ImportType;
  file_name?: string | null;
  row_count: number;
  status: string;
  imported_at?: string | null;
  creator_name?: string | null;
};

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const importDefinitions: ImportDefinition[] = [
  {
    type: 'inventory',
    label: 'Inventory',
    description: 'Create or refresh inventory master records.',
    columns: ['product_id', 'fixed_sku', 'product_name', 'description', 'category', 'brand', 'unit', 'quantity', 'cost_per_unit', 'mrp', 'selling_price', 'item_type', 'gst_hsn_code', 'gst_rate'],
    sampleRow: {
      product_id: 'PRD-1001',
      fixed_sku: 'SKU1001',
      product_name: 'Notebook A4',
      description: 'Demo product',
      category: 'Stationery',
      brand: 'Apni Stationery',
      unit: 'pcs',
      quantity: 100,
      cost_per_unit: 25,
      mrp: 50,
      selling_price: 45,
      item_type: 'OWN',
      gst_hsn_code: '4820',
      gst_rate: 12,
    },
    note: 'selling_price should not exceed mrp; item_type must be OWN or VENDOR.',
  },
  {
    type: 'inventory_logs',
    label: 'Inventory Logs',
    description: 'Bulk add inventory log entries.',
    columns: ['product_id', 'fixed_sku', 'quantity', 'cost_per_unit', 'notes'],
    sampleRow: {
      product_id: 'PRD-1001',
      fixed_sku: 'SKU1001',
      quantity: 10,
      cost_per_unit: 25,
      notes: 'Opening stock adjustment',
    },
  },
  {
    type: 'orders',
    label: 'Orders',
    description: 'Import sales orders with unique ref_no.',
    columns: ['ref_no', 'order_date', 'sales_channel', 'sales_channel_order_no', 'customer_name', 'customer_phone', 'customer_email', 'state', 'custom_gstin', 'status', 'invoice_no', 'invoice_file_path', 'invoice_date', 'dispatch_date', 'courier_partner', 'tracking_no', 'total_amount', 'total_tax', 'total_profit'],
    sampleRow: {
      ref_no: '260503001',
      order_date: '2026-05-03',
      sales_channel: 'AMAZON',
      sales_channel_order_no: 'AMZ-9981',
      customer_name: 'SAMPLE CUSTOMER',
      customer_phone: '9876543210',
      customer_email: 'customer@example.com',
      state: 'DELHI',
      custom_gstin: '',
      status: 'pending',
      invoice_no: 'INV-1001',
      invoice_file_path: '',
      invoice_date: '2026-05-03',
      dispatch_date: '',
      courier_partner: 'DELHIVERY',
      tracking_no: 'TRK9981',
      total_amount: 100,
      total_tax: 18,
      total_profit: 12,
    },
    note: 'ref_no must be unique. State and sales channel must match site-defined values.',
  },
  {
    type: 'order_items',
    label: 'Order Items',
    description: 'Bulk item rows for orders; the same ref_no can repeat across multiple rows.',
    columns: ['order_id', 'ref_no', 'sku_scanned', 'fixed_sku', 'quantity', 'source_type', 'vendor_name', 'cost_price', 'selling_price', 'gst_rate', 'gst_amount', 'discount', 'shipping_cost', 'marketplace_fee', 'total_amount', 'profit', 'notes'],
    sampleRow: {
      order_id: 1,
      ref_no: '260503001',
      sku_scanned: 'SKU1001',
      fixed_sku: 'SKU1001',
      quantity: 1,
      source_type: 'OWN',
      vendor_name: '',
      cost_price: 25,
      selling_price: 45,
      gst_rate: 12,
      gst_amount: 5.4,
      discount: 0,
      shipping_cost: 0,
      marketplace_fee: 0,
      total_amount: 50.4,
      profit: 14.4,
      notes: '',
    },
  },
  {
    type: 'rto_packages',
    label: 'RTO Packages',
    description: 'Import RTO package records.',
    columns: ['return_ref_no', 'customer_name', 'sales_channel', 'sku_ref', 'sku_fixed', 'additional_details', 'status'],
    sampleRow: {
      return_ref_no: 'RTO-1001',
      customer_name: 'SAMPLE CUSTOMER',
      sales_channel: 'AMAZON',
      sku_ref: 'SKU-REF-01',
      sku_fixed: 'SKU1001',
      additional_details: 'Returned damaged box',
      status: 'RTO DELIVERED - DAMAGED CONDITION',
    },
  },
  {
    type: 'settlements',
    label: 'Settlements',
    description: 'Import settlements linked to an order.',
    columns: ['order_id', 'order_ref_no', 'amount', 'transaction_no', 'payment_mode', 'payment_gateway', 'settlement_date', 'status', 'notes'],
    sampleRow: {
      order_id: 1,
      order_ref_no: '260503001',
      amount: 100,
      transaction_no: 'TXN9981',
      payment_mode: 'UPI',
      payment_gateway: 'Razorpay',
      settlement_date: '2026-05-03',
      status: 'pending',
      notes: 'Demo settlement',
    },
  },
];

const getDefinition = (type: ImportType) => importDefinitions.find((definition) => definition.type === type)!;

const formatLabel = (value: string) => value.replace(/_/g, ' ');

const toTitle = (value: string) => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (match) => match.toUpperCase());

const parseDateCell = (value: any) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return String(value);
    }

    const month = String(parsed.m).padStart(2, '0');
    const day = String(parsed.d).padStart(2, '0');
    return `${parsed.y}-${month}-${day}`;
  }

  return String(value).trim();
};

const normalizeString = (value: any) => String(value ?? '').trim();

const normalizeNumber = (value: any) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
};

const normalizeHeader = (value: any) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_');

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedType, setSelectedType] = useState<ImportType>('inventory');
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, any>>>([]);
  const [rowErrors, setRowErrors] = useState<Record<string, string[]>>({});
  const [fileName, setFileName] = useState('');
  const [fileSizeMb, setFileSizeMb] = useState('0.00');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<ImportHistoryRow[]>([]);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await apiRequest<{ status: string; data: ImportHistoryRow[] }>('/imports/history');
      setHistoryRows(response.data || []);
    } catch (exception: any) {
      setError(exception?.message || 'Unable to load import history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const definition = useMemo(() => getDefinition(selectedType), [selectedType]);
  const hasErrors = useMemo(() => Object.values(rowErrors).some((items) => items.length > 0), [rowErrors]);

  const resetPreview = () => {
    setRawRows([]);
    setPreviewRows([]);
    setRowErrors({});
    setFileName('');
    setFileSizeMb('0.00');
  };

  const buildTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(definition.label, { views: [{ state: 'frozen', ySplit: 1 }] });

    worksheet.columns = definition.columns.map((column) => ({
      header: toTitle(column),
      key: column,
      width: Math.max(16, Math.min(32, column.length + 6)),
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB8C1CC' } },
        left: { style: 'thin', color: { argb: 'FFB8C1CC' } },
        bottom: { style: 'thin', color: { argb: 'FFB8C1CC' } },
        right: { style: 'thin', color: { argb: 'FFB8C1CC' } },
      };
    });

    const sampleRow = worksheet.addRow(definition.sampleRow);
    sampleRow.height = 20;
    sampleRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
      cell.font = { bold: false, color: { argb: 'FF1F2937' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    definition.columns.forEach((column, index) => {
      const sampleValue = String(definition.sampleRow[column] ?? '');
      worksheet.getColumn(index + 1).width = Math.max(column.length + 6, sampleValue.length + 4, 14);
    });

    worksheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + definition.columns.length)}1` };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${definition.type}_template.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const previewFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size must be less than ${MAX_FILE_SIZE_MB} MB.`);
      resetPreview();
      return;
    }

    setLoading(true);
    setPreviewLoading(true);
    setError('');
    setSuccess('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rawSheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      const headerRow = rawSheetRows[0] || [];
      const headerMap = new Map<string, number>();

      headerRow.forEach((header, index) => {
        headerMap.set(normalizeHeader(header), index);
      });

      const dataRows = rawSheetRows.slice(1);
      const normalized = dataRows
        .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
        .map((row) => {
          const result: Record<string, any> = {};

          definition.columns.forEach((column) => {
            const index = headerMap.get(normalizeHeader(toTitle(column))) ?? headerMap.get(column);
            const value = index !== undefined ? row[index] : '';

            if (column.includes('date')) {
              result[column] = parseDateCell(value);
            } else if (['quantity', 'order_id'].includes(column)) {
              result[column] = normalizeNumber(value);
            } else if (['cost_per_unit', 'mrp', 'selling_price', 'gst_rate', 'gst_amount', 'discount', 'shipping_cost', 'marketplace_fee', 'total_amount', 'profit', 'amount', 'total_tax', 'total_profit'].includes(column)) {
              result[column] = normalizeNumber(value);
            } else {
              result[column] = normalizeString(value);
            }
          });

          return result;
        });

      setRawRows(normalized);
      setFileName(file.name);
      setFileSizeMb((file.size / (1024 * 1024)).toFixed(2));

      const response = await apiRequest<PreviewResponse>('/imports/preview', {
        method: 'POST',
        body: JSON.stringify({ type: selectedType, rows: normalized }),
      });

      setPreviewRows(response.data.rows || []);
      setRowErrors(response.data.row_errors || {});

      if (!response.data.rows?.length) {
        setError('No data rows found in the uploaded file.');
      }
    } catch (exception: any) {
      setError(exception?.message || 'Unable to parse or preview file.');
      resetPreview();
    } finally {
      setLoading(false);
      setPreviewLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await previewFile(file);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const importRows = async () => {
    if (!rawRows.length) {
      setError('Please upload a file first.');
      return;
    }

    if (hasErrors) {
      setError('Fix validation errors before importing.');
      return;
    }

    setConfirmOpen(true);
  };

  const confirmImport = async () => {
    setConfirmOpen(false);
    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiRequest<{ status: string; message?: string; data?: { created_rows: number; imported_at: string } }>('/imports', {
        method: 'POST',
        body: JSON.stringify({ type: selectedType, rows: rawRows, file_name: fileName }),
      });

      setSuccess(`${response.message || 'Import completed successfully.'} Imported rows: ${response.data?.created_rows || 0}`);
      resetPreview();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (exception: any) {
      setError(exception?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const activeErrors = Object.entries(rowErrors).filter(([, values]) => values.length > 0).length;

  const openHistory = async () => {
    setHistoryOpen(true);
    await loadHistory();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Bulk Import
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select an import type, download its Excel template, fill data, preview validations, and confirm before import. File size must be under {MAX_FILE_SIZE_MB} MB.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 2, mb: 3 }}>
          <TextField
            select
            fullWidth
            label="Import Type"
            value={selectedType}
            onChange={(event) => {
              setSelectedType(event.target.value as ImportType);
              resetPreview();
              setError('');
              setSuccess('');
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          >
            {importDefinitions.map((item) => (
              <MenuItem key={item.type} value={item.type}>{item.label}</MenuItem>
            ))}
          </TextField>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{definition.label}</Typography>
            <Typography variant="body2" color="text.secondary">{definition.description}</Typography>
            {definition.note ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {definition.note}
              </Typography>
            ) : null}
          </Box>
        </Box>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Button variant="outlined" onClick={buildTemplate} disabled={importing || loading}>
            Download Excel Template
          </Button>
          <Button variant="contained" onClick={openFilePicker} disabled={importing || loading}>
            Upload Filled Excel
          </Button>
          <Button variant="contained" color="success" onClick={importRows} disabled={importing || !rawRows.length || hasErrors}>
            Import to System
          </Button>
          <Button variant="outlined" onClick={openHistory}>
            View Import History
          </Button>
        </Box>

        <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
          File: {fileName || 'No file uploaded'} · Size: {fileSizeMb} MB · Preview rows: {previewRows.length} · Validation issues: {activeErrors}
        </Typography>

        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />

        <Divider sx={{ my: 2 }} />

        <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 2, maxHeight: 560 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 70 }}>#</TableCell>
                {definition.columns.map((column) => (
                  <TableCell key={column} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatLabel(column)}</TableCell>
                ))}
                <TableCell sx={{ fontWeight: 700 }}>Validation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewLoading ? (
                <TableRow>
                  <TableCell colSpan={definition.columns.length + 2} align="center">Processing preview...</TableCell>
                </TableRow>
              ) : previewRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={definition.columns.length + 2} align="center">
                    No preview available yet.
                  </TableCell>
                </TableRow>
              ) : previewRows.map((row, index) => {
                const errors = rowErrors[String(index)] || [];
                return (
                  <TableRow key={index} sx={{ bgcolor: errors.length ? '#fff1f2' : 'inherit' }}>
                    <TableCell>{index + 1}</TableCell>
                    {definition.columns.map((column) => (
                      <TableCell key={`${index}-${column}`} sx={{ whiteSpace: 'nowrap' }}>
                        {String(row[column] ?? '')}
                      </TableCell>
                    ))}
                    <TableCell sx={{ color: errors.length ? 'error.main' : 'text.secondary', minWidth: 240 }}>
                      {errors.length > 0 ? errors.join('; ') : 'OK'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Import</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1 }}>
            You are about to import {rawRows.length} row(s) into <strong>{definition.label}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            File size is {fileSizeMb} MB and validation is currently clean. Please confirm to proceed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmImport} disabled={importing}>
            {importing ? 'Importing...' : 'Confirm Import'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Import History</DialogTitle>
        <DialogContent>
          <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>File</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rows</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Who</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">Loading history...</TableCell>
                  </TableRow>
                ) : historyRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No import history found.</TableCell>
                  </TableRow>
                ) : historyRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.import_type}</TableCell>
                    <TableCell>{row.file_name || '-'}</TableCell>
                    <TableCell>{row.row_count}</TableCell>
                    <TableCell>{row.creator_name || '-'}</TableCell>
                    <TableCell>{row.imported_at || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
