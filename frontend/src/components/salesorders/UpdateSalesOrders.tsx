import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { apiRequest } from '../../features/backend/api';
import InlineLoader from '../common/InlineLoader';

const BUTTON_COLOR = '#465fff';

type ListOrder = {
  id: number;
  ref_no: string;
  order_date: string;
  customer_name: string;
  sales_channel: string;
  status: string;
  sales_channel_order_no: string;
  state: string;
  item_count: number;
  last_updated: string;
  updated_by?: string | null;
};

type ListResponse = {
  status: string;
  data: {
    orders: ListOrder[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
};

function useTailwindDarkMode() {
  const [isDark, setIsDark] = useState(
    typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') : false,
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

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

const UpdateSalesOrders = () => {
  const navigate = useNavigate();
  const isDark = useTailwindDarkMode();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<ListOrder[]>([]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [total, setTotal] = useState(0);

  const fetchOrders = async (targetPage = page, targetLimit = rowsPerPage) => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('page', String(targetPage + 1));
      params.set('limit', String(targetLimit));
      if (search.trim()) params.set('search', search.trim());
      if (status && status !== 'all') params.set('status', status);
      if (fromDate) params.set('date_from', fromDate);
      if (toDate) params.set('date_to', toDate);

      const response = await apiRequest<ListResponse>(`/orders/updates?${params.toString()}`);
      setOrders(response.data.orders || []);
      setTotal(response.data.pagination.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders(0, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    setPage(0);
    void fetchOrders(0, rowsPerPage);
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setFromDate('');
    setToDate('');
    setPage(0);
    void fetchOrders(0, rowsPerPage);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
    void fetchOrders(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setRowsPerPage(value);
    setPage(0);
    void fetchOrders(0, value);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: isDark ? '#181F2A' : '#fff',
          color: isDark ? '#fff' : '#353535',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate('/sales-orders')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" className="app-page-title" sx={{ fontWeight: 800 }}>
            Update Sales Orders
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search by ref/customer/channel/tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 210 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(String(e.target.value))}>
              <MenuItem value="all">All Eligible</MenuItem>
              <MenuItem value="in_transit">IN TRANSIT</MenuItem>
              <MenuItem value="delivered">DELIVERED</MenuItem>
              <MenuItem value="cancelled">CANCELLED</MenuItem>
              <MenuItem value="rto_delivered">RTO DELIVERED</MenuItem>
            </Select>
          </FormControl>

          <TextField
            type="date"
            size="small"
            label="From"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            type="date"
            size="small"
            label="To"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Button variant="contained" onClick={applyFilters} sx={{ bgcolor: BUTTON_COLOR, textTransform: 'none' }}>
            Apply
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={resetFilters} sx={{ textTransform: 'none' }}>
            Reset
          </Button>
        </Box>
      </Paper>

      {error ? (
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2, color: '#b42318', backgroundColor: '#fef3f2' }}>{error}</Paper>
      ) : null}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden', backgroundColor: isDark ? '#181F2A' : '#fff' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ref No</TableCell>
                <TableCell>Order Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Sales Channel</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Channel Order No</TableCell>
                <TableCell>State</TableCell>
                <TableCell align="center">Items</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell>Updated By</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                      <InlineLoader message="Loading orders..." />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">No orders found.</TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.ref_no} hover>
                    <TableCell>{order.ref_no}</TableCell>
                    <TableCell>{order.order_date || '-'}</TableCell>
                    <TableCell>{order.customer_name || '-'}</TableCell>
                    <TableCell>{order.sales_channel || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={formatStatusLabel(order.status)}
                        sx={{
                          ...getStatusChipSx(order.status, isDark),
                          fontWeight: 700,
                          borderRadius: 1.5,
                        }}
                      />
                    </TableCell>
                    <TableCell>{order.sales_channel_order_no || '-'}</TableCell>
                    <TableCell>{order.state || '-'}</TableCell>
                    <TableCell align="center">{order.item_count || 0}</TableCell>
                    <TableCell>{order.last_updated || '-'}</TableCell>
                    <TableCell>{order.updated_by || '-'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Update order">
                        <IconButton onClick={() => navigate(`/update-sales-orders/${order.ref_no}`)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 15, 25, 50, 100]}
        />
      </Paper>
    </Container>
  );
};

export default UpdateSalesOrders;