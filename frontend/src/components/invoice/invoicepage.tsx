import React, { useMemo, useState, useEffect, useContext } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  TextField,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete,
  Backdrop,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Print as PrintIcon, Preview as PreviewIcon } from '@mui/icons-material';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { AuthContext } from '../../context/AuthContext';
import API_BASE_URL from '../../apicallconfig';
import { apiRequest } from '../../features/backend/api';
import InvoiceDocument from './InvoiceDocument';

const COMPANY_LOGO_PREVIEW = '/LOGO.png';
const COMPANY_LOGO_PDF = '/LOGO.png';
const COMPANY_NAME = 'APNI STATIONERY';
const COMPANY_ADDRESS = 'ROHINI, DELHI - 110089 North West Delhi DELHI 110089';
const COMPANY_EMAIL = 'info@apnistationery.com';
const COMPANY_GST = '07AAWFD8245N1ZJ';

const indianStatesAndUTs = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const paymentModes = ['CASH', 'NEFT', 'UPI', 'CARD', 'PG SETTLEMENT'];
const salesChannels = ['AMAZON', 'FLIPKART', 'MEESHO', 'OFFLINE', 'WEBSITE'];

type ProductOption = {
  product_id: string;
  sku_fixed: string;
  product_name: string;
  mrp: number;
  gst_hsn_code: string;
  gst_rate: number;
  cost_per_unit: number;
  item_type: string;
  label: string;
};

type InvoiceItem = {
  serial: number;
  product: ProductOption | null;
  sku_scanned: string;
  quantity: number;
  mrp: number;
  rate: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  netAmount: number;
  hsnSac: string;
  additionalDetails: string;
};

type TaxSummaryRow = {
  gstRate: number;
  taxableAmount: number;
  gstAmount: number;
};

const emptyItem = (serial: number): InvoiceItem => ({
  serial,
  product: null,
  sku_scanned: '',
  quantity: 1,
  mrp: 0,
  rate: 0,
  discountAmount: 0,
  taxableAmount: 0,
  gstRate: 0,
  gstAmount: 0,
  netAmount: 0,
  hsnSac: '-',
  additionalDetails: '',
});

const getToken = () => sessionStorage.getItem('oms_auth_token') || localStorage.getItem('oms_auth_token');

const nowIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function toWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n: number): string {
    let str = '';
    if (n > 99) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n = n % 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' ';
      n = n % 10;
    }
    if (n >= 10 && n <= 19) {
      str += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0 && n < 10) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  let result = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const rest = num % 100;

  if (crore) result += numToWords(crore) + ' Crore ';
  if (lakh) result += numToWords(lakh) + ' Lakh ';
  if (thousand) result += numToWords(thousand) + ' Thousand ';
  if (hundred) result += units[hundred] + ' Hundred ';
  if (num > 100 && rest) result += 'and ';
  if (rest) result += numToWords(rest) + ' ';

  return (result.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

const round2 = (n: number) => Number((n || 0).toFixed(2));
const allowedLineNet = (item: InvoiceItem) => round2(Number(item.mrp || 0) * Number(item.quantity || 0));

const deriveRateFromMrpInclusive = (mrpInclusive: number, gstRate: number) => {
  const safeMrp = Math.max(0, Number(mrpInclusive || 0));
  const safeGst = Math.max(0, Number(gstRate || 0));

  if (safeGst <= 0) {
    return round2(safeMrp);
  }

  return round2(safeMrp / (1 + safeGst / 100));
};

const recalcItem = (item: InvoiceItem): InvoiceItem => {
  const quantity = 1;
  const rate = Math.max(0, Number(item.rate || 0));
  const gross = round2(quantity * rate);
  const discount = Math.max(0, Number(item.discountAmount || 0));
  const effectiveDiscount = discount > gross ? gross : discount;
  const taxable = round2(gross - effectiveDiscount);
  const gstRate = Math.max(0, Number(item.gstRate || 0));
  const gstAmount = round2((taxable * gstRate) / 100);
  const net = round2(taxable + gstAmount);

  return {
    ...item,
    quantity,
    rate,
    discountAmount: effectiveDiscount,
    taxableAmount: taxable,
    gstAmount,
    netAmount: net,
  };
};

const InvoicePage: React.FC = () => {
  const { user } = useContext(AuthContext) as any;
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(nowIsoDate());
  const [modeOfPayment, setModeOfPayment] = useState('CASH');
  const [buyerName, setBuyerName] = useState('');
  const [buyerAdd, setBuyerAdd] = useState('');
  const [buyerState, setBuyerState] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerGst, setBuyerGst] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [salesChannel, setSalesChannel] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([emptyItem(1)]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [pushPending, setPushPending] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadBootstrap = async () => {
    setError('');
    try {
      const [numRes, productsRes] = await Promise.all([
        apiRequest<{ status: string; data: { invoice_number: string; invoice_date: string } }>('/invoices/ref-no'),
        apiRequest<{ status: string; data: ProductOption[] }>('/invoices/products'),
      ]);

      setInvoiceNumber(numRes.data?.invoice_number || '');
      setInvoiceDate(numRes.data?.invoice_date || nowIsoDate());
      setProductOptions(productsRes.data || []);
    } catch (e: any) {
      setError(e?.message || 'Unable to initialize invoice page.');
    }
  };

  useEffect(() => {
    void loadBootstrap();
  }, []);

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const merged = { ...next[idx], ...patch };
      next[idx] = recalcItem(merged);
      return next;
    });
  };

  const handleProductChange = (idx: number, product: ProductOption | null) => {
    if (!product) {
      updateItem(idx, {
        product: null,
        sku_scanned: '',
        quantity: 1,
        mrp: 0,
        rate: 0,
        gstRate: 0,
        hsnSac: '-',
      });
      return;
    }

    const mrpInclusive = Number(product.mrp || 0);
    const gstRate = Number(product.gst_rate || 0);
    const defaultRate = deriveRateFromMrpInclusive(mrpInclusive, gstRate);

    updateItem(idx, {
      product,
      quantity: 1,
      mrp: mrpInclusive,
      rate: defaultRate,
      discountAmount: 0,
      gstRate,
      hsnSac: product.gst_hsn_code?.trim() ? product.gst_hsn_code.trim() : '-',
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem(prev.length + 1)]);

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    const next = items.filter((_, i) => i !== idx).map((row, index) => ({ ...row, serial: index + 1 }));
    setItems(next);
  };

  const actualTotal = useMemo(() => round2(items.reduce((sum, row) => sum + row.quantity * row.rate, 0)), [items]);
  const totalDiscount = useMemo(() => round2(items.reduce((sum, row) => sum + row.discountAmount, 0)), [items]);
  const totalTaxable = useMemo(() => round2(items.reduce((sum, row) => sum + row.taxableAmount, 0)), [items]);
  const totalGst = useMemo(() => round2(items.reduce((sum, row) => sum + row.gstAmount, 0)), [items]);
  const netAmount = useMemo(() => round2(items.reduce((sum, row) => sum + row.netAmount, 0)), [items]);
  const roundedTotal = Math.round(netAmount);

  const taxSummaryRows: TaxSummaryRow[] = useMemo(() => {
    const grouped = new Map<number, TaxSummaryRow>();
    items.forEach((item) => {
      const rate = Number(item.gstRate || 0);
      const existing = grouped.get(rate) || { gstRate: rate, taxableAmount: 0, gstAmount: 0 };
      existing.taxableAmount = round2(existing.taxableAmount + Number(item.taxableAmount || 0));
      existing.gstAmount = round2(existing.gstAmount + Number(item.gstAmount || 0));
      grouped.set(rate, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => a.gstRate - b.gstRate);
  }, [items]);

  const amountInWords = useMemo(() => toWords(roundedTotal), [roundedTotal]);

  const netAmountViolations = useMemo(() => {
    return items
      .map((item, idx) => {
        const allowed = allowedLineNet(item);
        const hasViolation = Number(item.netAmount || 0) > allowed + 0.009;
        if (!hasViolation) {
          return null;
        }

        return {
          idx,
          serial: item.serial,
          allowed,
          net: round2(Number(item.netAmount || 0)),
        };
      })
      .filter(Boolean) as Array<{ idx: number; serial: number; allowed: number; net: number }>;
  }, [items]);

  const hasNetAmountViolation = netAmountViolations.length > 0;

  const validate = () => {
    if (!invoiceNumber) return 'Invoice number missing.';
    if (!invoiceDate) return 'Invoice date missing.';
    if (!modeOfPayment) return 'Mode of payment is required.';
    if (!buyerName.trim()) return 'Buyer name is mandatory.';
    if (!buyerState.trim()) return 'State is mandatory.';
    if (!buyerContact.trim()) return 'Contact details are mandatory.';
    if (!salesChannel.trim()) return 'Sales channel is mandatory.';

    for (const item of items) {
      if (!item.product) return 'Please select product in all rows.';
      if (!item.sku_scanned.trim()) return 'SKU Scanned is mandatory for all rows.';
      if (item.quantity !== 1) return 'Quantity must remain 1 for invoice flow.';
      if (Number(item.netAmount || 0) > allowedLineNet(item) + 0.009) {
        return `Net amount cannot exceed MRP x quantity in line ${item.serial}.`;
      }
    }

    return '';
  };

  const buildPdfItems = () => items.map((item) => ({
    serial: item.serial,
    productName: item.product?.product_name || '',
    skuFixed: item.product?.sku_fixed || '',
    skuScanned: item.sku_scanned,
    hsnSac: item.hsnSac,
    gstRate: item.gstRate,
    quantity: item.quantity,
    mrp: item.mrp,
    rate: item.rate,
    discountAmount: item.discountAmount,
    taxableAmount: item.taxableAmount,
    gstAmount: item.gstAmount,
    netAmount: item.netAmount,
  }));

  const resetForNext = async () => {
    setBuyerName('');
    setBuyerAdd('');
    setBuyerState('');
    setBuyerContact('');
    setBuyerGst('');
    setAdditionalDetails('');
    setSalesChannel('');
    setModeOfPayment('CASH');
    setItems([emptyItem(1)]);
    setPushPending(true);
    await loadBootstrap();
  };

  const handleGeneratePDF = async () => {
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const pdfBlob = await pdf(
        <InvoiceDocument
          companyLogo={COMPANY_LOGO_PDF}
          companyName={COMPANY_NAME}
          companyAddress={COMPANY_ADDRESS}
          companyEmail={COMPANY_EMAIL}
          companyGst={COMPANY_GST}
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          modeOfPayment={modeOfPayment}
          buyerName={buyerName}
          buyerAdd={buyerAdd}
          buyerState={buyerState}
          buyerContact={buyerContact}
          buyerGst={buyerGst}
          additionalDetails={additionalDetails}
          salesChannel={salesChannel}
          items={buildPdfItems()}
          taxSummaryRows={taxSummaryRows}
          actualTotal={actualTotal}
          totalDiscount={totalDiscount}
          totalTaxable={totalTaxable}
          totalGst={totalGst}
          roundedTotal={roundedTotal}
          amountInWords={amountInWords}
        />
      ).toBlob();

      const formData = new FormData();
      formData.append('invoice_pdf', pdfBlob, `Invoice_${invoiceNumber}.pdf`);
      formData.append('invoice_number', invoiceNumber);

      const uploadResp = await fetch(`${API_BASE_URL}/invoices/upload-temp-pdf`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: formData,
      });
      const uploadData = await uploadResp.json();
      if (!uploadResp.ok || uploadData?.status !== 'success') {
        throw new Error(uploadData?.message || 'Unable to upload invoice PDF.');
      }

      const payload = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        mode_of_payment: modeOfPayment,
        buyer_name: buyerName.trim().toUpperCase(),
        buyer_add: buyerAdd.trim(),
        buyer_state: buyerState.trim().toUpperCase(),
        buyer_contact: buyerContact.trim(),
        buyer_gst: buyerGst.trim().toUpperCase(),
        additional_details: additionalDetails.trim(),
        sales_channel: salesChannel.trim().toUpperCase(),
        actual_total: actualTotal,
        total_discount: totalDiscount,
        total_taxable: totalTaxable,
        total_gst: totalGst,
        net_amount: roundedTotal,
        amount_in_words: amountInWords,
        invoice_temp_id: uploadData?.data?.temp_id,
        push_to_pending: pushPending,
        created_by: user?.username || user?.name || 'SYSTEM',
        items: items.map((item, index) => ({
          line_no: index + 1,
          product_name: item.product?.product_name || '',
          sku_fixed: item.product?.sku_fixed || '',
          sku_scanned: item.sku_scanned.trim().toUpperCase(),
          quantity: item.quantity,
          mrp: item.mrp,
          rate: item.rate,
          discount_amount: item.discountAmount,
          taxable_amount: item.taxableAmount,
          gst_rate: item.gstRate,
          gst_amount: item.gstAmount,
          net_amount: item.netAmount,
          hsn_sac: item.hsnSac || '-',
          additional_details: item.additionalDetails || '',
        })),
      };

      const saveResp = await apiRequest<{ status: string; data: { invoice_number: string; pushed_order_ref_no?: string } }>('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (saveResp.status !== 'success') {
        throw new Error('Unable to save invoice.');
      }

      const pushedMessage = saveResp.data?.pushed_order_ref_no
        ? ` | Pushed to order ref: ${saveResp.data.pushed_order_ref_no}`
        : '';
      setSuccess(`Invoice ${saveResp.data.invoice_number} saved successfully${pushedMessage}`);

      const token = getToken();
      const pdfResp = await fetch(`${API_BASE_URL}/invoices/${encodeURIComponent(saveResp.data.invoice_number)}/pdf`, {
        method: 'GET',
        headers: {
          Accept: 'application/pdf',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!pdfResp.ok) {
        throw new Error('Invoice saved, but unable to open PDF preview.');
      }

      const pdfFileBlob = await pdfResp.blob();
      const pdfObjectUrl = window.URL.createObjectURL(pdfFileBlob);
      window.open(pdfObjectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(pdfObjectUrl), 120000);

      await resetForNext();
    } catch (err: any) {
      setError(err?.message || 'Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <img
            src={COMPANY_LOGO_PREVIEW}
            alt="Company Logo"
            style={{ height: 62, marginRight: 20 }}
            onError={(event) => {
              event.currentTarget.src = COMPANY_LOGO_PDF;
            }}
          />
          <Box>
            <Typography variant="h5" fontWeight="bold">{COMPANY_NAME}</Typography>
            <Typography variant="body2">{COMPANY_ADDRESS}</Typography>
            <Typography variant="body2">EMAIL - {COMPANY_EMAIL} | GST NUMBER - {COMPANY_GST}</Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <TextField label="Invoice Number *" value={invoiceNumber} InputProps={{ readOnly: true }} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Date *" value={invoiceDate} InputProps={{ readOnly: true }} fullWidth />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth required>
              <InputLabel>Mode of Payment *</InputLabel>
              <Select value={modeOfPayment} label="Mode of Payment *" onChange={(e) => setModeOfPayment(String(e.target.value))}>
                {paymentModes.map((mode) => <MenuItem key={mode} value={mode}>{mode}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mb: 1 }}>Buyer (Bill To)</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Name *"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value.toUpperCase())}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Address" value={buyerAdd} onChange={(e) => setBuyerAdd(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>State *</InputLabel>
              <Select value={buyerState} label="State *" onChange={(e) => setBuyerState(String(e.target.value))}>
                {indianStatesAndUTs.map((state) => <MenuItem key={state} value={state}>{state}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Contact Details *" value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} required fullWidth />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="GST Number" value={buyerGst} onChange={(e) => setBuyerGst(e.target.value.toUpperCase())} inputProps={{ maxLength: 20 }} fullWidth />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>Sales Channel *</InputLabel>
              <Select value={salesChannel} label="Sales Channel *" onChange={(e) => setSalesChannel(String(e.target.value))}>
                {salesChannels.map((channel) => <MenuItem key={channel} value={channel}>{channel}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Additional Details" value={additionalDetails} onChange={(e) => setAdditionalDetails(e.target.value)} fullWidth />
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mb: 1 }}>Description of Goods</Typography>
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SI</TableCell>
                <TableCell sx={{ minWidth: 280 }}>Product Name *</TableCell>
                <TableCell>SKU Scanned *</TableCell>
                <TableCell>HSN/SAC</TableCell>
                <TableCell>GST Rate</TableCell>
                <TableCell>MRP</TableCell>
                <TableCell>Rate *</TableCell>
                <TableCell>Discount Amt</TableCell>
                <TableCell>Taxable Amt</TableCell>
                <TableCell>GST Amt</TableCell>
                <TableCell>Net Amt</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.serial}>
                  <TableCell>{item.serial}</TableCell>
                  <TableCell>
                    <Autocomplete
                      options={productOptions}
                      value={item.product}
                      getOptionLabel={(opt) => (opt ? `${opt.product_name} (${opt.sku_fixed})` : '')}
                      onChange={(_, value) => handleProductChange(idx, value)}
                      renderInput={(params) => <TextField {...params} label="Select Product *" required size="small" />}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={item.sku_scanned}
                      onChange={(e) => updateItem(idx, { sku_scanned: e.target.value.toUpperCase() })}
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" value={item.hsnSac || '-'} InputProps={{ readOnly: true }} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" value={item.gstRate} InputProps={{ readOnly: true }} />
                  </TableCell>
                  <TableCell><TextField size="small" value={item.mrp} InputProps={{ readOnly: true }} /></TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={item.rate}
                      inputProps={{ min: 0, step: '0.01' }}
                      onChange={(e) => updateItem(idx, { rate: Number(e.target.value || 0) })}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={item.discountAmount}
                      inputProps={{ min: 0, step: '0.01' }}
                      onChange={(e) => updateItem(idx, { discountAmount: Number(e.target.value || 0) })}
                    />
                  </TableCell>
                  <TableCell>Rs. {item.taxableAmount.toFixed(2)}</TableCell>
                  <TableCell>Rs. {item.gstAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Typography sx={{ color: Number(item.netAmount || 0) > allowedLineNet(item) + 0.009 ? 'error.main' : 'inherit' }}>
                      Rs. {item.netAmount.toFixed(2)}
                    </Typography>
                    {Number(item.netAmount || 0) > allowedLineNet(item) + 0.009 ? (
                      <Typography variant="caption" sx={{ color: 'error.main', display: 'block', lineHeight: 1.2 }}>
                        Must be &lt;= Rs. {allowedLineNet(item).toFixed(2)}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <IconButton disabled={items.length === 1} onClick={() => removeItem(idx)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={12}>
                  <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined">Add Item</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography><b>Actual Total:</b> Rs. {actualTotal.toFixed(2)}</Typography>
          <Typography><b>Total Discount:</b> Rs. {totalDiscount.toFixed(2)}</Typography>
          <Typography><b>Total Taxable:</b> Rs. {totalTaxable.toFixed(2)}</Typography>
          <Typography><b>Total GST:</b> Rs. {totalGst.toFixed(2)}</Typography>

          <Typography sx={{ mt: 1, fontWeight: 700 }}>Tax Summary (GST Rate wise)</Typography>
          {taxSummaryRows.map((row) => (
            <Typography key={row.gstRate}>
              GST {row.gstRate}% | Taxable Amount: Rs. {row.taxableAmount.toFixed(2)} | GST Amount: Rs. {row.gstAmount.toFixed(2)}
            </Typography>
          ))}

          <Typography variant="h6" color="primary" sx={{ mt: 1 }}><b>Total Bill Amount (Rounded):</b> Rs. {roundedTotal.toFixed(2)}</Typography>
          <Typography sx={{ fontWeight: 'bold', mt: 1 }}>Amount In Words: {amountInWords}</Typography>
        </Box>

        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.main', color: 'white', borderRadius: 1 }}>
          <Typography variant="body2"><b>Declaration:</b> THIS IS COMPUTER GENERATED INVOICE DOES NOT REQUIRE ANY SIGNATURE.</Typography>
          <Typography variant="body2">THANKS FOR SHOPPING WITH APNI STATIONERY.</Typography>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Typography>for APNI STATIONERY</Typography>
          <Typography>Authorised Signatory</Typography>
        </Box>

        <Box sx={{ mt: 2, mb: 1, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {hasNetAmountViolation ? (
            <Typography sx={{ color: 'error.main', fontWeight: 600, width: '100%' }}>
              Net amount cannot exceed MRP x quantity for a product. Please correct highlighted rows.
            </Typography>
          ) : null}
          <Button variant="outlined" startIcon={<PreviewIcon />} onClick={() => setShowPreview(true)}>Preview Invoice</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handleGeneratePDF} disabled={isSaving || hasNetAmountViolation}>
            {isSaving ? 'Generating...' : 'Generate PDF & Save'}
          </Button>
          <FormControlLabel
            control={<Checkbox checked={pushPending} onChange={(e) => setPushPending(e.target.checked)} />}
            label="Push data in Pending Packages"
          />
        </Box>

        {success && <Typography sx={{ mt: 2, color: 'green', fontWeight: 700 }}>{success}</Typography>}
        {error && <Typography sx={{ mt: 2, color: 'red', fontWeight: 700 }}>{error}</Typography>}

        {showPreview && (
          <Backdrop open={showPreview} onClick={() => setShowPreview(false)} sx={{ zIndex: 1200 }}>
            <PDFViewer style={{ width: '76vw', height: '92vh' }}>
              <InvoiceDocument
                companyLogo={COMPANY_LOGO_PDF}
                companyName={COMPANY_NAME}
                companyAddress={COMPANY_ADDRESS}
                companyEmail={COMPANY_EMAIL}
                companyGst={COMPANY_GST}
                invoiceNumber={invoiceNumber}
                invoiceDate={invoiceDate}
                modeOfPayment={modeOfPayment}
                buyerName={buyerName}
                buyerAdd={buyerAdd}
                buyerState={buyerState}
                buyerContact={buyerContact}
                buyerGst={buyerGst}
                additionalDetails={additionalDetails}
                salesChannel={salesChannel}
                items={buildPdfItems()}
                taxSummaryRows={taxSummaryRows}
                actualTotal={actualTotal}
                totalDiscount={totalDiscount}
                totalTaxable={totalTaxable}
                totalGst={totalGst}
                roundedTotal={roundedTotal}
                amountInWords={amountInWords}
              />
            </PDFViewer>
          </Backdrop>
        )}
      </Paper>
    </Container>
  );
};

export default InvoicePage;
