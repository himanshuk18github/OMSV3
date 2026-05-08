import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Container,
  IconButton,
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
  useTheme,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import InlineLoader from '../common/InlineLoader';
import { apiRequest } from '../../features/backend/api';
import API_BASE_URL from '../../apicallconfig';

const BUTTON_COLOR = '#465fff';
const TOKEN_KEY = 'oms_auth_token';
const GST_RATES = [0, 5, 12, 18, 28];
const SALES_CHANNELS = ['AMAZON', 'FLIPKART', 'MEESHO', 'OFFLINE', 'WEBSITE'];

const STATE_OPTIONS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Delhi', 'Puducherry',
  'Ladakh', 'Jammu and Kashmir',
]
  .map((value) => value.toUpperCase())
  .sort((a, b) => a.localeCompare(b));

type SkuOption = {
  sku_fixed: string;
  product_name: string;
  mrp: number;
  cost_per_unit: number;
};

type VendorOption = {
  id: number;
  name: string;
};

type OrderItemRow = {
  item_id: number;
  quantity: number;
  fixed_sku: string;
  sku_scanned: string;
  source_type: 'OWN' | 'VENDOR';
  vendor_name: string;
  product_name: string;
  extra_details: string;
  mrp: number;
  cost_price: number;
  selling_price: number;
  gst_rate: number;
  gst_amount: number;
  line_total: number;
  discount: number;
  shipping_cost: number;
  marketplace_fee: number;
  calc_basis: 'selling' | 'total';
};

type DetailsResponse = {
  status: string;
  data: {
    ref_no: string;
    invoice_available: boolean;
    created_by_name: string | null;
    created_by_role: string | null;
    created_at_ist: string | null;
    items: Array<{
      item_id: number;
      quantity: number;
      order_date: string;
      sales_channel: string;
      sales_channel_order_no: string;
      customer_name: string;
      customer_phone: string;
      customer_email: string;
      invoice_no: string;
      invoice_date: string | null;
      state: string;
      fixed_sku: string;
      sku_scanned: string;
      source_type: string;
      vendor_name: string;
      product_name: string | null;
      extra_details: string | null;
      mrp: number;
      cost_price: number;
      selling_price: number;
      gst_rate: number;
      gst_amount: number;
      line_total: number;
      discount: number;
      shipping_cost: number;
      marketplace_fee: number;
    }>;
    sku_options: SkuOption[];
  };
};

const recalcRow = (row: OrderItemRow): OrderItemRow => {
  const quantity = Number(row.quantity || 1);
  const gstRate = Number(row.gst_rate || 0);

  let sellingPrice = Number(row.selling_price || 0);
  let saleAmount = 0;
  let lineTotal = Number(row.line_total || 0);

  if (row.calc_basis === 'total') {
    const divider = 1 + gstRate / 100;
    saleAmount = divider > 0 ? Number((lineTotal / divider).toFixed(2)) : lineTotal;
    sellingPrice = quantity > 0 ? Number((saleAmount / quantity).toFixed(2)) : saleAmount;
  } else {
    saleAmount = Number((sellingPrice * quantity).toFixed(2));
    lineTotal = Number((saleAmount * (1 + gstRate / 100)).toFixed(2));
  }

  const gstAmount = Number((lineTotal - saleAmount).toFixed(2));

  return {
    ...row,
    selling_price: sellingPrice,
    gst_amount: gstAmount,
    line_total: lineTotal,
  };
};

const OrderConfirmDetails = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { refNo } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [invoiceAvailable, setInvoiceAvailable] = useState(false);
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [createdByLabel, setCreatedByLabel] = useState('N/A');
  const [createdAtIst, setCreatedAtIst] = useState('N/A');

  const [orderDate, setOrderDate] = useState<Date | null>(new Date());
  const [salesChannel, setSalesChannel] = useState(SALES_CHANNELS[0]);
  const [salesChannelOrderNo, setSalesChannelOrderNo] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date());
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [rows, setRows] = useState<OrderItemRow[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!refNo) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [details, vendorsRes] = await Promise.all([
          apiRequest<DetailsResponse>(`/orders/confirmation/${encodeURIComponent(refNo)}`),
          apiRequest<{ status: string; data: Array<{ id: number; name: string }> }>(`/vendors/all`),
        ]);

        if (!active) {
          return;
        }

        const first = details.data.items[0];
        const channelFromDb = (first?.sales_channel || '').toUpperCase().trim();
        const channelValue = SALES_CHANNELS.find((option) => option === channelFromDb) || channelFromDb || SALES_CHANNELS[0];

        setOrderDate(first?.order_date ? new Date(first.order_date) : new Date());
        setSalesChannel(channelValue);
        setSalesChannelOrderNo((first?.sales_channel_order_no || '').toUpperCase());
        setInvoiceNo((first?.invoice_no || '').toUpperCase());
        setInvoiceDate(first?.invoice_date ? new Date(first.invoice_date) : new Date());
        setCustomerName((first?.customer_name || '').toUpperCase());
        setCustomerPhone(first?.customer_phone || '');
        setCustomerEmail(first?.customer_email || '');
        setStateValue((first?.state || '').toUpperCase());

        setCreatedByLabel(
          details.data.created_by_name
            ? `${String(details.data.created_by_name).toUpperCase()} (${String(details.data.created_by_role || 'N/A').toUpperCase()})`
            : 'N/A'
        );
        setCreatedAtIst(details.data.created_at_ist || 'N/A');

        setInvoiceAvailable(Boolean(details.data.invoice_available));
        setSkuOptions(
          (details.data.sku_options || []).map((sku) => ({
            ...sku,
            sku_fixed: String(sku.sku_fixed || '').toUpperCase(),
            product_name: String(sku.product_name || '').toUpperCase(),
          }))
        );
        setVendors(
          (vendorsRes.data || []).map((vendor) => ({
            id: vendor.id,
            name: String(vendor.name || '').toUpperCase(),
          }))
        );

        setRows(
          (details.data.items || []).map((item) =>
            recalcRow({
              item_id: item.item_id,
              quantity: Number(item.quantity || 1),
              fixed_sku: String(item.fixed_sku || '').toUpperCase(),
              sku_scanned: String(item.sku_scanned || '').toUpperCase(),
              source_type: String(item.source_type || 'OWN').toUpperCase() === 'VENDOR' ? 'VENDOR' : 'OWN',
              vendor_name: String(item.vendor_name || '').toUpperCase(),
              product_name: String(item.product_name || '').toUpperCase(),
              extra_details: String(item.extra_details || '').toUpperCase(),
              mrp: Number(item.mrp || 0),
              cost_price: Number(item.cost_price || 0),
              selling_price: Number(item.selling_price || 0),
              gst_rate: Number(item.gst_rate || 18),
              gst_amount: Number(item.gst_amount || 0),
              line_total: Number(item.line_total || 0),
              discount: Number(item.discount || 0),
              shipping_cost: Number(item.shipping_cost || 0),
              marketplace_fee: Number(item.marketplace_fee || 0),
              calc_basis: 'selling',
            })
          )
        );
      } catch (e: any) {
        if (active) {
          setError(e?.message || 'Failed to load order details.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [refNo]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.totalTax += Number(row.gst_amount || 0);
        acc.totalAmount += Number(row.line_total || 0);
        return acc;
      },
      { totalTax: 0, totalAmount: 0 }
    );
  }, [rows]);

  const salesChannelOptions = useMemo(() => {
    const set = new Set(SALES_CHANNELS);
    if (salesChannel) {
      set.add(salesChannel.toUpperCase());
    }
    return Array.from(set.values());
  }, [salesChannel]);

  const handleRowChange = (index: number, field: keyof OrderItemRow, value: any) => {
    setRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      if (field === 'selling_price') {
        row.calc_basis = 'selling';
      }
      if (field === 'line_total') {
        row.calc_basis = 'total';
      }

      if (field === 'fixed_sku') {
        const sku = skuOptions.find((option) => option.sku_fixed.toUpperCase() === String(value || '').toUpperCase());
        if (sku) {
          row.fixed_sku = String(sku.sku_fixed || '').toUpperCase();
          row.product_name = String(sku.product_name || '').toUpperCase();
          row.mrp = Number(sku.mrp || 0);
          row.cost_price = Number(sku.cost_per_unit || 0);
        }
      }

      if (field === 'source_type' && value === 'OWN') {
        row.vendor_name = '';
      }

      if (field === 'vendor_name') {
        row.vendor_name = String(value || '').toUpperCase();
      }

      if (field === 'extra_details') {
        row.extra_details = String(value || '').toUpperCase();
      }

      updated[index] = recalcRow(row);
      return updated;
    });
  };

  const handleViewAttachment = async () => {
    if (!refNo || !invoiceAvailable) {
      return;
    }

    try {
      const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE_URL}/orders/confirmation/${encodeURIComponent(refNo)}/invoice`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Attachment not available.');
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
    } catch (e: any) {
      setError(e?.message || 'Failed to open attachment.');
    }
  };

  const validate = () => {
    if (!orderDate || !invoiceDate || !salesChannel || !salesChannelOrderNo.trim() || !invoiceNo.trim() || !customerName.trim() || !stateValue.trim()) {
      return 'Please fill all required order-level fields.';
    }

    if (rows.length === 0) {
      return 'No order items found for confirmation.';
    }

    for (const row of rows) {
      if (!row.fixed_sku || Number(row.selling_price) <= 0 || Number(row.line_total) <= 0) {
        return 'Each row requires SKU fixed, selling price, and total amount.';
      }
      if (!GST_RATES.includes(Number(row.gst_rate))) {
        return 'GST rate must be one of 0%, 5%, 12%, 18%, or 28%.';
      }
      if (row.source_type === 'VENDOR' && !row.vendor_name.trim()) {
        return 'Vendor name is mandatory for VENDOR source items.';
      }
    }

    return '';
  };

  const handleSubmit = async () => {
    if (!refNo) {
      return;
    }

    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSaving(true);
      setError('');

      await apiRequest<{ status: string; message: string }>(`/orders/confirmation/${encodeURIComponent(refNo)}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          order_date: format(orderDate as Date, 'yyyy-MM-dd'),
          sales_channel: salesChannel.trim().toUpperCase(),
          sales_channel_order_no: salesChannelOrderNo.trim().toUpperCase(),
          invoice_no: invoiceNo.trim().toUpperCase(),
          invoice_date: format(invoiceDate as Date, 'yyyy-MM-dd'),
          customer_name: customerName.trim().toUpperCase(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim(),
          state: stateValue.trim().toUpperCase(),
          items: rows.map((row) => ({
            item_id: row.item_id,
            quantity: row.quantity,
            fixed_sku: row.fixed_sku.toUpperCase(),
            sku_scanned: row.sku_scanned.toUpperCase(),
            source_type: row.source_type,
            vendor_name: row.vendor_name ? row.vendor_name.toUpperCase() : null,
            selling_price: Number(row.selling_price),
            gst_rate: Number(row.gst_rate),
            line_total: Number(row.line_total),
            cost_price: Number(row.cost_price || 0),
            discount: Number(row.discount || 0),
            shipping_cost: Number(row.shipping_cost || 0),
            marketplace_fee: Number(row.marketplace_fee || 0),
            extra_details: row.extra_details || '',
          })),
        }),
      });

      navigate('/sales-orders/confirmation');
    } catch (e: any) {
      setError(e?.message || 'Failed to submit order confirmation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'transparent', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={() => navigate('/sales-orders/confirmation')}
            sx={{
              mr: 2,
              color: isDark ? '#fff' : '#353535',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,60,60,0.06)',
              '&:hover': { bgcolor: isDark ? 'rgba(70,95,255,0.10)' : 'rgba(70,95,255,0.07)' },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" className="app-page-title" sx={{ fontWeight: 800, color: isDark ? '#fff' : '#353535' }}>
            Confirm Order - Ref No: {refNo}
          </Typography>
        </Box>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Paper sx={{ p: 2, mb: 2, bgcolor: isDark ? '#181F2A' : '#fff', borderRadius: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Order Date*"
                value={orderDate}
                format="yyyy-MM-dd"
                onChange={(date) => setOrderDate(date)}
                slotProps={{ textField: { size: 'small' } }}
              />
            </LocalizationProvider>
            <TextField
              select
              label="Sales Channel*"
              size="small"
              value={salesChannel}
              onChange={(e) => setSalesChannel(e.target.value.toUpperCase())}
            >
              {salesChannelOptions.map((channel) => (
                <MenuItem key={channel} value={channel}>{channel}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Sales Channel Order No*"
              size="small"
              value={salesChannelOrderNo}
              onChange={(e) => setSalesChannelOrderNo(e.target.value.toUpperCase())}
            />
            <TextField
              label="Invoice No*"
              size="small"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value.toUpperCase())}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Invoice Date*"
                value={invoiceDate}
                format="yyyy-MM-dd"
                onChange={(date) => setInvoiceDate(date)}
                slotProps={{ textField: { size: 'small' } }}
              />
            </LocalizationProvider>
            <TextField
              label="Customer Name*"
              size="small"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value.toUpperCase())}
            />
            <TextField
              label="Customer Email"
              size="small"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
            <TextField
              label="Customer Phone"
              size="small"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </Box>
          <Box sx={{ mt: 2, width: { xs: '100%', md: '24.5%' } }}>
            <Autocomplete
              options={STATE_OPTIONS}
              value={stateValue}
              onChange={(_e, value) => setStateValue((value || '').toUpperCase())}
              renderInput={(params) => <TextField {...params} label="State*" size="small" />}
            />
          </Box>
        </Paper>

        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={handleViewAttachment}
            disabled={!invoiceAvailable}
            sx={{
              color: isDark ? BUTTON_COLOR : '#353535',
              borderColor: isDark ? BUTTON_COLOR : '#353535',
              fontWeight: 600,
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: isDark ? 'rgba(70,95,255,0.10)' : 'rgba(70,95,255,0.05)',
                borderColor: BUTTON_COLOR,
                color: BUTTON_COLOR,
              },
            }}
          >
            View Attachment
          </Button>
        </Box>

        <Paper sx={{ bgcolor: isDark ? '#181F2A' : '#fff', borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Sr. No.</TableCell>
                  <TableCell>SKU Fixed*</TableCell>
                  <TableCell>Scanned SKU</TableCell>
                  <TableCell>Source Type*</TableCell>
                  <TableCell>Vendor Name</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Extra Details</TableCell>
                  <TableCell>MRP</TableCell>
                  <TableCell>Selling Price*</TableCell>
                  <TableCell>GST Rate*</TableCell>
                  <TableCell>GST Amount</TableCell>
                  <TableCell>Total Amount*</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} align="center">
                      <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                        <InlineLoader message="Loading order details..." />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => {
                    const skuChoices = [...skuOptions];
                    if (row.fixed_sku && !skuChoices.some((option) => option.sku_fixed.toUpperCase() === row.fixed_sku.toUpperCase())) {
                      skuChoices.unshift({
                        sku_fixed: row.fixed_sku.toUpperCase(),
                        product_name: row.product_name.toUpperCase(),
                        mrp: row.mrp,
                        cost_per_unit: row.cost_price,
                      });
                    }

                    const selectedSku = skuChoices.find((option) => option.sku_fixed.toUpperCase() === row.fixed_sku.toUpperCase()) || null;
                    const vendorChoices = [...vendors];
                    if (row.vendor_name && !vendorChoices.some((vendor) => vendor.name === row.vendor_name)) {
                      vendorChoices.unshift({ id: -row.item_id, name: row.vendor_name });
                    }
                    const selectedVendor = vendorChoices.find((vendor) => vendor.name === row.vendor_name) || null;

                    return (
                      <TableRow key={row.item_id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell sx={{ minWidth: 260 }}>
                          <Autocomplete
                            options={skuChoices}
                            value={selectedSku}
                            onChange={(_e, value) => {
                              if (value) {
                                handleRowChange(index, 'fixed_sku', value.sku_fixed.toUpperCase());
                              }
                            }}
                            getOptionLabel={(option) => `${option.sku_fixed} - ${option.product_name}`}
                            renderInput={(params) => <TextField {...params} size="small" required />}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: isDark ? '#232d46' : '#f9f9f9' }}>{row.sku_scanned}</TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            value={row.source_type}
                            onChange={(e) => handleRowChange(index, 'source_type', e.target.value as 'OWN' | 'VENDOR')}
                          >
                            <MenuItem value="OWN">OWN</MenuItem>
                            <MenuItem value="VENDOR">VENDOR</MenuItem>
                          </TextField>
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Autocomplete
                            disabled={row.source_type !== 'VENDOR'}
                            options={vendorChoices}
                            value={selectedVendor}
                            onChange={(_e, value) => handleRowChange(index, 'vendor_name', value?.name || '')}
                            getOptionLabel={(option) => option.name}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                size="small"
                                required={row.source_type === 'VENDOR'}
                                placeholder={row.source_type === 'VENDOR' ? 'SELECT VENDOR' : 'OWN'}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: isDark ? '#232d46' : '#f9f9f9' }}>{row.product_name}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={row.extra_details}
                            onChange={(e) => handleRowChange(index, 'extra_details', e.target.value)}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: isDark ? '#232d46' : '#f9f9f9' }}>{row.mrp.toFixed(2)}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: '0.01' }}
                            value={row.selling_price}
                            onChange={(e) => handleRowChange(index, 'selling_price', Number(e.target.value || 0))}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            value={row.gst_rate}
                            onChange={(e) => handleRowChange(index, 'gst_rate', Number(e.target.value))}
                          >
                            {GST_RATES.map((rate) => (
                              <MenuItem key={rate} value={rate}>{rate}%</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        <TableCell sx={{ bgcolor: isDark ? '#232d46' : '#f9f9f9' }}>{row.gst_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: '0.01' }}
                            value={row.line_total}
                            onChange={(e) => handleRowChange(index, 'line_total', Number(e.target.value || 0))}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ mt: 2, p: 2, bgcolor: isDark ? '#181F2A' : '#fff', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>Total Tax: ₹{totals.totalTax.toFixed(2)}</Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>Total Amount: ₹{totals.totalAmount.toFixed(2)}</Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>Created By: {createdByLabel}</Typography>
          <Typography variant="body2">Created At (IST): {createdAtIst}</Typography>
        </Paper>

        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={loading || saving}
            sx={{
              bgcolor: BUTTON_COLOR,
              color: '#fff',
              borderRadius: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              ':hover': { bgcolor: '#2840c0' },
            }}
          >
            {saving ? 'Submitting...' : 'Submit & Move To In Transit'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default OrderConfirmDetails;
