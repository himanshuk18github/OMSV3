import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { apiRequest } from "../../features/backend/api";
import InlineLoader from "../common/InlineLoader";
import { usePageLoadingState } from "../../context/PageLoadingContext";

type InventoryLogRow = {
  id: number;
  product_id: string;
  fixed_sku: string | null;
  product_name: string | null;
  quantity: number;
  cost_per_unit: string | number | null;
  notes: string | null;
  updated_by_name: string | null;
  created_at: string;
};

type InventoryLogsResponse = {
  status?: string;
  data?: {
    data?: InventoryLogRow[];
    total?: number;
  };
};

const useTailwindDarkMode = () => {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false,
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
};

const formatDateTime = (dateTime: string) =>
  new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(dateTime));

const InventoryLogsPage = () => {
  const navigate = useNavigate();
  const isDark = useTailwindDarkMode();
  const onLoadingComplete = usePageLoadingState();
  const [logs, setLogs] = useState<InventoryLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [fixedSkuFilter, setFixedSkuFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  const pageBg = isDark ? "transparent" : "transparent";
  const tableBg = isDark ? "#181F2A" : "#fff";
  const tableText = isDark ? "#fff" : "#353535";
  const inputBg = isDark ? "#232d46" : "#fff";
  const headerText = isDark ? "#fff" : "#222";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("per_page", String(rowsPerPage));
    params.set("page", String(page + 1));

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }

    if (fixedSkuFilter.trim()) {
      params.set("fixed_sku", fixedSkuFilter.trim());
    }

    if (fromDate) {
      params.set("from_date", fromDate);
    }

    if (toDate) {
      params.set("to_date", toDate);
    }

    params.set("refresh_token", String(refreshToken));

    return params.toString();
  }, [fixedSkuFilter, fromDate, page, refreshToken, rowsPerPage, searchTerm, toDate]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<InventoryLogsResponse>(`/inventory/logs?${queryString}`);
      const payload = response.data;
      setLogs(payload?.data || []);
      setTotalCount(payload?.total || 0);
    } catch {
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      onLoadingComplete();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);

    return () => clearTimeout(timer);
  }, [queryString]);

  const handleRefresh = () => {
    setSearchTerm("");
    setFixedSkuFilter("");
    setFromDate("");
    setToDate("");
    setPage(0);
    setRefreshToken((current) => current + 1);
  };

  return (
    <Container maxWidth="xl" sx={{ bgcolor: pageBg, minHeight: "100vh", py: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/items")} sx={{ color: headerText }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" className="app-page-title" sx={{ color: headerText, fontWeight: 800 }}>
              View inventory logs entry
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? "#bfc7d1" : "#667085" }}>
              Search log rows by SKU fixed, product ID, product name, notes, or updater.
            </Typography>
          </Box>
        </Box>

        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          variant="outlined"
          sx={{
            color: isDark ? "#fff" : "#353535",
            borderColor: isDark ? "#465fff" : "#c4c4c4",
            background: isDark ? "#232d46" : "#fff",
            fontWeight: 600,
            borderRadius: 2,
            '&:hover': {
              bgcolor: isDark ? "#232d46" : "#f5f5f5",
              borderColor: "#465fff",
            },
          }}
        >
          Reset Filters
        </Button>
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search logs"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(0);
          }}
          sx={{
            bgcolor: inputBg,
            borderRadius: 2,
            '& .MuiInputBase-root': {
              color: tableText,
              bgcolor: inputBg,
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? "#232d46" : "#c4c4c4",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          size="small"
          placeholder="Filter by fixed SKU"
          value={fixedSkuFilter}
          onChange={(event) => {
            setFixedSkuFilter(event.target.value);
            setPage(0);
          }}
          sx={{
            bgcolor: inputBg,
            borderRadius: 2,
            '& .MuiInputBase-root': {
              color: tableText,
              bgcolor: inputBg,
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? "#232d46" : "#c4c4c4",
            },
          }}
        />
        <TextField
          size="small"
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.target.value);
            setPage(0);
          }}
          sx={{
            bgcolor: inputBg,
            borderRadius: 2,
            '& .MuiInputBase-root': {
              color: tableText,
              bgcolor: inputBg,
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? "#232d46" : "#c4c4c4",
            },
          }}
        />
        <TextField
          size="small"
          type="date"
          value={toDate}
          onChange={(event) => {
            setToDate(event.target.value);
            setPage(0);
          }}
          sx={{
            bgcolor: inputBg,
            borderRadius: 2,
            '& .MuiInputBase-root': {
              color: tableText,
              bgcolor: inputBg,
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? "#232d46" : "#c4c4c4",
            },
          }}
        />
      </Box>

      <Paper sx={{ bgcolor: tableBg, color: tableText, borderRadius: 1, overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: tableText, fontWeight: 700 }}>Product ID</TableCell>
                <TableCell sx={{ color: tableText, fontWeight: 700 }}>Fixed SKU</TableCell>
                <TableCell sx={{ color: tableText, fontWeight: 700 }}>Product Name</TableCell>
                <TableCell sx={{ color: tableText, fontWeight: 700 }} align="right">Quantity</TableCell>
                <TableCell sx={{ color: tableText, fontWeight: 700 }} align="right">Cost / Unit</TableCell>
                <TableCell sx={{ color: tableText, fontWeight: 700 }}>Updated By</TableCell>
                <TableCell sx={{ color: tableText, fontWeight: 700 }}>Updated At</TableCell>
                <TableCell sx={{ color: tableText, fontWeight: 700 }}>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <InlineLoader message="Loading inventory logs..." />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center", py: 6, color: tableText }}>
                    No inventory logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ color: tableText }}>{log.product_id}</TableCell>
                    <TableCell sx={{ color: tableText }}>{log.fixed_sku || "-"}</TableCell>
                    <TableCell sx={{ color: tableText }}>{log.product_name || "-"}</TableCell>
                    <TableCell sx={{ color: tableText }} align="right">{log.quantity}</TableCell>
                    <TableCell sx={{ color: tableText }} align="right">{log.cost_per_unit ?? "-"}</TableCell>
                    <TableCell sx={{ color: tableText }}>{log.updated_by_name || "-"}</TableCell>
                    <TableCell sx={{ color: tableText }}>{formatDateTime(log.created_at)}</TableCell>
                    <TableCell sx={{ color: tableText, maxWidth: 240 }}>{log.notes || "-"}</TableCell>
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
          onPageChange={(_event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>
    </Container>
  );
};

export default InventoryLogsPage;