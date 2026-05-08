import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
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
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { apiRequest } from '../../features/backend/api';
import API_BASE_URL from '../../apicallconfig';
import InlineLoader from '../common/InlineLoader';

const TOKEN_KEY = 'oms_auth_token';
const BUTTON_COLOR = '#465fff';
const STATUS_OPTIONS = ['in_transit', 'delivered', 'cancelled', 'rto_delivered'];
const GST_RATES = [0, 5, 12, 18, 28];

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

type OrderMeta = {
  id: number;
  ref_no: string;
  status: string;
  order_date: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  sales_channel: string;
  sales_channel_order_no: string;
  state: string;
  custom_gstin: string;
  courier_partner: string;
  tracking_no: string;
  invoice_no: string;
  invoice_date: string;
  invoice_available: boolean;
  total_amount: number;
  total_tax: number;
  total_profit: number;
  created_at?: string;
  created_by?: string;
  updated_by?: string;
  updated_at?: string;
};

type ItemRow = {
  item_id: number;
  quantity: number;
  sku_scanned: string;
  fixed_sku: string;
  source_type: 'OWN' | 'VENDOR';
  vendor_name: string;
  product_name: string;
  mrp: number;
  cost_price: number;
  selling_price: number;
  gst_rate: number;
  gst_amount: number;
  discount: number;
  shipping_cost: number;
  marketplace_fee: number;
  line_total: number;
  profit: number;
  extra_details: string;
  calc_basis: 'selling' | 'total';
};

type DetailsResponse = {
  status: string;
  data: {
    order: OrderMeta;
    items: ItemRow[];
    sku_options: SkuOption[];
    vendors: VendorOption[];
  };
};

const recalcRow = (row: ItemRow): ItemRow => {
  const quantity = Number(row.quantity || 1);
  const gstRate = Number(row.gst_rate || 0);
  const costPrice = Number(row.cost_price || 0);
  const discount = Number(row.discount || 0);
  const shipping = Number(row.shipping_cost || 0);
  const marketplace = Number(row.marketplace_fee || 0);

  let sellingPrice = Number(row.selling_price || 0);
  let lineSelling = 0;

  if (row.calc_basis === 'total') {
    const totalNoDiscount = Number(row.line_total || 0) + discount;
    const divider = 1 + gstRate / 100;
    lineSelling = divider > 0 ? Number((totalNoDiscount / divider).toFixed(2)) : totalNoDiscount;
    sellingPrice = quantity > 0 ? Number((lineSelling / quantity).toFixed(2)) : lineSelling;
  } else {
    lineSelling = Number((sellingPrice * quantity).toFixed(2));
  }

  const gstAmount = Number((lineSelling * (gstRate / 100)).toFixed(2));
  const lineTotal = Number((lineSelling + gstAmount - discount).toFixed(2));
  const profit = Number((lineSelling - costPrice * quantity - marketplace - shipping - discount).toFixed(2));

  return {
    ...row,
    selling_price: sellingPrice,
    gst_amount: gstAmount,
    line_total: lineTotal,
    profit,
  };
};

const formatStatusLabel = (status: string) => (status || '').split('_').join(' ').toUpperCase();

const getStatusChipSx = (status: string, isDark: boolean) => {
  const key = (status || '').toLowerCase();

  if (key === 'in_transit') {
    return {
      color: isDark ? '#f0f9ff' : '#065986',
      backgroundColor: isDark ? '#0b4a6f' : '#e0f2fe',
    };
  }
  if (key === 'delivered') {
    return {
      color: isDark ? '#ecfdf3' : '#027a48',
      backgroundColor: isDark ? '#05603a' : '#d1fadf',
    };
  }
  if (key === 'cancelled') {
    return {
      color: isDark ? '#fffbfa' : '#b42318',
      backgroundColor: isDark ? '#7a271a' : '#fee4e2',
    };
  }
  if (key === 'rto_delivered') {
    return {
      color: isDark ? '#fffaeb' : '#b54708',
      backgroundColor: isDark ? '#7a2e0e' : '#fef0c7',
    };
  }

  return {
    color: isDark ? '#e4e7ec' : '#344054',
    backgroundColor: isDark ? '#1d2939' : '#f2f4f7',
  };
};

const UpdateSalesOrdersDetails = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { refNo } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [order, setOrder] = useState<OrderMeta | null>(null);
  const [statusValue, setStatusValue] = useState('in_transit');
  const [courierPartner, setCourierPartner] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [customGstin, setCustomGstin] = useState('');
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);

  const loadDetails = async () => {
    if (!refNo) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await apiRequest<DetailsResponse>(`/orders/updates/${encodeURIComponent(refNo)}`);
      setOrder(res.data.order);
      setStatusValue(
        STATUS_OPTIONS.includes((res.data.order.status || '').toLowerCase())
          ? res.data.order.status.toLowerCase()
          : 'in_transit',
      );
      setCourierPartner(res.data.order.courier_partner || '');
      setTrackingNo(res.data.order.tracking_no || '');
      setCustomGstin(res.data.order.custom_gstin || '');
      setSkuOptions(res.data.sku_options || []);
      setVendors(res.data.vendors || []);
      setItems((res.data.items || []).map((row) => recalcRow({ ...row, calc_basis: 'selling' })));
    } catch (e: any) {
      setError(e?.message || 'Unable to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refNo]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, row) => {
          acc.tax += Number(row.gst_amount || 0);
          acc.total += Number(row.line_total || 0);
          acc.profit += Number(row.profit || 0);
          return acc;
        },
        { tax: 0, total: 0, profit: 0 },
      ),
    [items],
  );

  const handleRowChange = (index: number, field: keyof ItemRow, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };

      if (field === 'selling_price') row.calc_basis = 'selling';
      if (field === 'line_total') row.calc_basis = 'total';

      if (field === 'fixed_sku') {
        const sku = skuOptions.find((s) => s.sku_fixed.toUpperCase() === String(value || '').toUpperCase());
        if (sku) {
          row.fixed_sku = sku.sku_fixed.toUpperCase();
          row.product_name = sku.product_name.toUpperCase();
          row.mrp = Number(sku.mrp || 0);
          row.cost_price = Number(sku.cost_per_unit || 0);
        }
      }

      if (field === 'source_type' && value === 'OWN') {
        row.vendor_name = '';
      }

      next[index] = recalcRow(row);
      return next;
    });
  };

  const handleViewAttachment = async () => {
    if (!refNo || !order?.invoice_available) return;

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
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (e: any) {
      setError(e?.message || 'Unable to open attachment.');
    }
  };

  const handleSubmit = async () => {
    if (!refNo) return;

    if (items.some((row) => row.source_type === 'VENDOR' && !row.vendor_name.trim())) {
      setError('Vendor name is mandatory for VENDOR source items.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await apiRequest(`/orders/updates/${encodeURIComponent(refNo)}`, {
        method: 'POST',
        body: JSON.stringify({
          status: statusValue,
          courier_partner: courierPartner.trim() || null,
          tracking_no: trackingNo.trim() || null,
          custom_gstin: customGstin.trim() || null,
          items: items.map((row) => ({
            item_id: row.item_id,
            fixed_sku: row.fixed_sku,
            source_type: row.source_type,
            vendor_name: row.source_type === 'VENDOR' ? row.vendor_name : null,
            selling_price: Number(row.selling_price),
            gst_rate: Number(row.gst_rate),
            line_total: Number(row.line_total),
            discount: Number(row.discount || 0),
            shipping_cost: Number(row.shipping_cost || 0),
            marketplace_fee: Number(row.marketplace_fee || 0),
            extra_details: row.extra_details || '',
            calc_basis: row.calc_basis,
          })),
        }),
      });

      setSuccess('Order updated successfully.');
      await loadDetails();
    } catch (e: any) {
      setError(e?.message || 'Unable to update order.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <InlineLoader message="Loading order details..." />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'transparent', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/sales-orders/update')} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" className="app-page-title" sx={{ fontWeight: 800 }}>
              Update Order - Ref No: {refNo}
            </Typography>
          </Box>
          <Chip
            label={formatStatusLabel(order?.status || statusValue)}
            sx={{
              ...getStatusChipSx(order?.status || statusValue, isDark),
              fontWeight: 700,
              borderRadius: 1.5,
            }}
          />
        </Box>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

        <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: isDark ? '#181F2A' : '#fff' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(180px, 1fr))' }, gap: 2 }}>
            <TextField
              label="Status"
              size="small"
              select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{formatStatusLabel(s)}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Courier Partner"
              size="small"
              value={courierPartner}
              onChange={(e) => setCourierPartner(e.target.value)}
            />
            <TextField
              label="Tracking Number"
              size="small"
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
            />
            <TextField
              label="Customer GSTIN"
              size="small"
              value={customGstin}
              onChange={(e) => setCustomGstin(e.target.value.toUpperCase())}
              inputProps={{ maxLength: 20 }}
            />
            <TextField label="Customer" size="small" value={order?.customer_name || ''} disabled />
            <TextField label="Sales Channel" size="small" value={order?.sales_channel || ''} disabled />
          </Box>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Updated By: {order?.updated_by || '-'} | Updated At: {order?.updated_at || '-'}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={handleViewAttachment}
              disabled={!order?.invoice_available}
            >
              View Attachment
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: isDark ? '#181F2A' : '#fff' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Order Details
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(180px, 1fr))' }, gap: 2 }}>
            <TextField label="Order Date" size="small" value={order?.order_date || ''} disabled />
            <TextField label="Channel Order No" size="small" value={order?.sales_channel_order_no || ''} disabled />
            <TextField label="Customer Phone" size="small" value={order?.customer_phone || ''} disabled />
            <TextField label="Customer Email" size="small" value={order?.customer_email || ''} disabled />
            <TextField label="State" size="small" value={order?.state || ''} disabled />
            <TextField label="Invoice No" size="small" value={order?.invoice_no || ''} disabled />
            <TextField label="Invoice Date" size="small" value={order?.invoice_date || ''} disabled />
            <TextField label="Created By" size="small" value={order?.created_by || ''} disabled />
            <TextField label="Created At" size="small" value={order?.created_at || ''} disabled />
            <TextField label="Current Total" size="small" value={`₹${Number(order?.total_amount || 0).toFixed(2)}`} disabled />
            <TextField label="Current Tax" size="small" value={`₹${Number(order?.total_tax || 0).toFixed(2)}`} disabled />
            <TextField label="Current Profit" size="small" value={`₹${Number(order?.total_profit || 0).toFixed(2)}`} disabled />
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: 2, bgcolor: isDark ? '#181F2A' : '#fff' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>SKU Fixed</TableCell>
                  <TableCell>Scanned SKU</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell>Source Type</TableCell>
                  <TableCell>Vendor Name</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">MRP</TableCell>
                  <TableCell align="right">Cost</TableCell>
                  <TableCell>Selling Price</TableCell>
                  <TableCell>GST Rate</TableCell>
                  <TableCell align="right">GST Amount</TableCell>
                  <TableCell>Discount</TableCell>
                  <TableCell>Shipping</TableCell>
                  <TableCell>Marketplace Fee</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell align="right">Profit</TableCell>
                  <TableCell>Extra Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row, index) => {
                  const vendorChoices = [...vendors];
                  if (row.vendor_name && !vendorChoices.some((v) => v.name === row.vendor_name)) {
                    vendorChoices.unshift({ id: -row.item_id, name: row.vendor_name });
                  }

                  return (
                    <TableRow key={row.item_id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell sx={{ minWidth: 260 }}>
                        <Autocomplete
                          size="small"
                          options={skuOptions}
                          value={skuOptions.find((s) => s.sku_fixed === row.fixed_sku) || null}
                          onChange={(_e, value) => {
                            if (value) handleRowChange(index, 'fixed_sku', value.sku_fixed);
                          }}
                          getOptionLabel={(option) => `${option.sku_fixed} - ${option.product_name}`}
                          renderInput={(params) => <TextField {...params} size="small" sx={{ minWidth: 240 }} />}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>{row.sku_scanned || '-'}</TableCell>
                      <TableCell align="center">{row.quantity}</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <TextField
                          select
                          size="small"
                          value={row.source_type}
                          onChange={(e) => handleRowChange(index, 'source_type', e.target.value as 'OWN' | 'VENDOR')}
                          sx={{ minWidth: 110 }}
                        >
                          <MenuItem value="OWN">OWN</MenuItem>
                          <MenuItem value="VENDOR">VENDOR</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Autocomplete
                          disabled={row.source_type !== 'VENDOR'}
                          size="small"
                          options={vendorChoices}
                          value={vendorChoices.find((v) => v.name === row.vendor_name) || null}
                          onChange={(_e, value) => handleRowChange(index, 'vendor_name', value?.name || '')}
                          getOptionLabel={(option) => option.name}
                          renderInput={(params) => <TextField {...params} size="small" sx={{ minWidth: 200 }} />}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>{row.product_name || '-'}</TableCell>
                      <TableCell align="right">{Number(row.mrp || 0).toFixed(2)}</TableCell>
                      <TableCell align="right">{Number(row.cost_price || 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ minWidth: 130 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          inputProps={{ min: 0, step: '0.01' }}
                          value={row.selling_price}
                          onChange={(e) => handleRowChange(index, 'selling_price', Number(e.target.value || 0))}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={row.gst_rate}
                          onChange={(e) => handleRowChange(index, 'gst_rate', Number(e.target.value))}
                        >
                          {GST_RATES.map((rate) => (
                            <MenuItem key={rate} value={rate}>{rate}%</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell align="right">{Number(row.gst_amount || 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ minWidth: 110 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          inputProps={{ min: 0, step: '0.01' }}
                          value={row.discount}
                          onChange={(e) => handleRowChange(index, 'discount', Number(e.target.value || 0))}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 110 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          inputProps={{ min: 0, step: '0.01' }}
                          value={row.shipping_cost}
                          onChange={(e) => handleRowChange(index, 'shipping_cost', Number(e.target.value || 0))}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 130 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          inputProps={{ min: 0, step: '0.01' }}
                          value={row.marketplace_fee}
                          onChange={(e) => handleRowChange(index, 'marketplace_fee', Number(e.target.value || 0))}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 130 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          inputProps={{ min: 0, step: '0.01' }}
                          value={row.line_total}
                          onChange={(e) => handleRowChange(index, 'line_total', Number(e.target.value || 0))}
                        />
                      </TableCell>
                      <TableCell align="right">{Number(row.profit || 0).toFixed(2)}</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={row.extra_details || ''}
                          onChange={(e) => handleRowChange(index, 'extra_details', e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: isDark ? '#181F2A' : '#fff' }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>Total Tax: ₹{totals.tax.toFixed(2)}</Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>Total Amount: ₹{totals.total.toFixed(2)}</Typography>
          <Typography variant="body2">Total Profit: ₹{totals.profit.toFixed(2)}</Typography>
        </Paper>

        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={saving || loading}
            sx={{ bgcolor: BUTTON_COLOR, textTransform: 'none' }}
          >
            {saving ? 'Saving...' : 'Save Order Updates'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default UpdateSalesOrdersDetails;