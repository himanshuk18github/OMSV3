import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../features/backend/api';

import {
    Box,
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Button,
    TextField,
    InputAdornment,
    Tooltip,
    Chip,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import InlineLoader from '../common/InlineLoader';

const BUTTON_COLOR = "#465fff";

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

// Tailwind dark mode detection hook - checks <html class="dark">
function useTailwindDarkMode() {
    const [isDark, setIsDark] = useState(
        typeof window !== "undefined"
            ? document.documentElement.classList.contains("dark")
            : false
    );
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains("dark"));
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

// Type for a sales order row
type SalesOrder = {
    ref_no: string;
    customer_name: string;
    sales_channel: string;
    created_at: string;
    sku_count: number;
    status: string;
};

const OrderConfirmation = () => {
    const navigate = useNavigate();
    const isDark = useTailwindDarkMode();

    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalCount, setTotalCount] = useState(0);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await apiRequest<{
                status: string;
                data: { orders: SalesOrder[]; total: number; page: number; limit: number };
            }>(
                `/orders/confirmation?page=${page + 1}&limit=${rowsPerPage}&search=${encodeURIComponent(searchTerm)}`
            );
            setOrders(data.data.orders ?? []);
            setTotalCount(data.data.total ?? 0);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setOrders([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchOrders();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [page, rowsPerPage, searchTerm]);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleRefresh = () => {
        setSearchTerm('');
        setPage(0);
        fetchOrders();
    };

    const handleConfirmOrder = (refNo: string) => {
        navigate(`/sales-orders/confirm/${refNo}`);
    };

    const formatDateTime = (dateTimeStr: string) => {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    // Color variables for consistency with NotFound and dark mode logic
    const bgColor = 'transparent';
    const cardBg = isDark ? '#181F2A' : '#fff';
    const tableText = isDark ? '#fff' : '#353535';
    const mutedText = isDark ? '#bfc7d1' : '#666';

    return (
        <Box
            sx={{
                bgcolor: bgColor,
                minHeight: '10vh',
                py: 4
            }}
        >
            <Container maxWidth="xl">
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                    <IconButton
                        onClick={() => navigate('/sales-orders')}
                        sx={{
                            color: tableText,
                            bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(60,60,60,0.06)",
                            mr: 1,
                            '&:hover': {
                                bgcolor: isDark ? "rgba(70,95,255,0.10)" : "rgba(70,95,255,0.07)"
                            }
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography
                        variant="h5"
                        className="app-page-title"
                        sx={{
                            fontWeight: 800,
                            color: tableText
                        }}
                    >
                        Order Confirmation
                    </Typography>
                </Box>

                <Box sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 3,
                    flexWrap: "wrap"
                }}>
                    <TextField
                        size="small"
                        placeholder="Search by Reference No..."
                        value={searchTerm}
                        onChange={handleSearch}
                        sx={{
                            minWidth: 260,
                            bgcolor: cardBg,
                            borderRadius: 2,
                            '& .MuiInputBase-root': {
                                color: tableText,
                                bgcolor: cardBg
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                        variant="contained"
                        sx={{
                            bgcolor: BUTTON_COLOR,
                            color: "#fff",
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: "none",
                            ':hover': {
                                bgcolor: "#2840c0"
                            }
                        }}
                    >
                        Refresh
                    </Button>
                </Box>

                <Paper
                    sx={{
                        bgcolor: cardBg,
                        borderRadius: 3,
                        boxShadow: isDark
                            ? "0 4px 12px rgba(30,40,80,0.31)"
                            : "0 4px 6px rgba(0,0,0,0.06)"
                    }}
                >
                    <TableContainer>
                        <Table
                            sx={{
                                '& .MuiTableCell-root': {
                                    color: tableText,
                                    background: cardBg
                                }
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell>Sr. No.</TableCell>
                                    <TableCell>Reference No.</TableCell>
                                    <TableCell>Customer Name</TableCell>
                                    <TableCell>Sales Channel</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created At</TableCell>
                                    <TableCell>No. of SKUs</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                                                <InlineLoader message="Loading pending orders..." />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ color: mutedText }}>
                                            No pending orders found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((order, index) => (
                                        <TableRow key={order.ref_no}
                                            sx={{
                                                '&:hover': {
                                                    bgcolor: isDark ? "#232d46" : "rgba(70,95,255,0.06)"
                                                }
                                            }}
                                        >
                                            <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                            <TableCell>{order.ref_no}</TableCell>
                                            <TableCell>{order.customer_name}</TableCell>
                                            <TableCell>{order.sales_channel}</TableCell>
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
                                            <TableCell>{formatDateTime(order.created_at)}</TableCell>
                                            <TableCell>{order.sku_count}</TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Confirm Order">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleConfirmOrder(order.ref_no)}
                                                        sx={{
                                                            color: "#12b76a",
                                                            bgcolor: isDark ? "#101828" : "#ecfdf3",
                                                            borderRadius: 2,
                                                            transition: "background 0.2s",
                                                            '&:hover': {
                                                                bgcolor: "#32d583",
                                                                color: "#fff"
                                                            }
                                                        }}
                                                    >
                                                        <CheckCircleIcon />
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
                        count={totalCount}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        sx={{
                            bgcolor: bgColor,
                            color: tableText,
                            borderRadius: 0,
                        }}
                    />
                </Paper>
            </Container>
        </Box>
    );
};

export default OrderConfirmation;