import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../apicallconfig";
import { usePageLoading } from "../../context/PageLoadingContext";
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
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import DispatchLogDetailsModal from "./DispatchLogDetailsModal";
import InlineLoader from "../common/InlineLoader";

type DispatchLog = {
  id: number;
  ref_no: string;
  customer_name: string;
  sales_channel: string;
  sku_count: number;
  status: string;
  created_at: string;
  created_by: string;
  updated_by: string;
};

type LogsResponse = {
  status: string;
  data: {
    data: DispatchLog[];
    current_page: number;
    per_page: number;
    total: number;
  };
};

type LogDetails = {
  id: number;
  ref_no: string;
  customer_name: string;
  sales_channel: string;
  status: string;
  order_date: string | null;
  dispatch_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  item_count: number;
  has_invoice: boolean;
  items: Array<{
    id: number;
    sku_scanned: string;
    fixed_sku: string;
    quantity: number;
    additional_details: string | null;
  }>;
};

type DetailsResponse = {
  status: string;
  data: LogDetails;
};

function getAuthToken(): string | null {
  return sessionStorage.getItem("oms_auth_token") || localStorage.getItem("oms_auth_token");
}

async function fetchWithAuth<T>(url: string): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Request failed.");
  }

  return payload as T;
}

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

const DispatchLogs = () => {
  const navigate = useNavigate();
  const isDark = useTailwindDarkMode();
  const { setPageLoading } = usePageLoading();

  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLogDetails, setSelectedLogDetails] = useState<LogDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const pageBg = "transparent";
  const tableBg = isDark ? "#181f2a" : "#ffffff";
  const tableText = isDark ? "#f3f4f6" : "#353535";
  const inputBg = isDark ? "#232d46" : "#ffffff";
  const headerText = isDark ? "#f3f4f6" : "#222222";

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setPageLoading(true);
      setErrorMessage("");

      const query = new URLSearchParams({
        page: String(page + 1),
        per_page: String(rowsPerPage),
      });

      if (searchTerm.trim()) {
        query.set("search", searchTerm.trim());
      }

      const payload = await fetchWithAuth<LogsResponse>(`${API_BASE_URL}/dispatches/logs?${query.toString()}`);
      setLogs(payload.data?.data || []);
      setTotalCount(payload.data?.total || 0);
    } catch (error: any) {
      setLogs([]);
      setTotalCount(0);
      setErrorMessage(error?.message || "Unable to fetch dispatch logs.");
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  const handleViewDetails = async (refNo: string) => {
    try {
      const payload = await fetchWithAuth<DetailsResponse>(`${API_BASE_URL}/dispatches/logs/${encodeURIComponent(refNo)}`);
      setSelectedLogDetails(payload.data);
      setIsModalOpen(true);
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to fetch dispatch details.");
    }
  };

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      void fetchLogs();
    }, 350);

    return () => window.clearTimeout(debounceId);
  }, [page, rowsPerPage, searchTerm, setPageLoading]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setPage(0);
    void fetchLogs();
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <Container maxWidth="xl" sx={{ bgcolor: pageBg, py: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/packages")} sx={{ color: headerText }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" className="app-page-title" sx={{ color: headerText, fontWeight: 800 }}>
            Dispatch Logs
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search reference/customer/channel"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(0);
            }}
            sx={{
              minWidth: 320,
              bgcolor: inputBg,
              borderRadius: 2,
              "& .MuiInputBase-root": {
                color: tableText,
                bgcolor: inputBg,
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark ? "#364152" : "#c4c4c4",
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

          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            variant="outlined"
            sx={{
              color: isDark ? "#ffffff" : "#353535",
              borderColor: isDark ? "#465fff" : "#c4c4c4",
              background: isDark ? "#232d46" : "#ffffff",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {errorMessage && (
        <Typography sx={{ color: "#ef4444", mb: 2, fontWeight: 600 }}>{errorMessage}</Typography>
      )}

      <Paper
        sx={{
          bgcolor: tableBg,
          color: tableText,
          borderRadius: 3,
          boxShadow: isDark ? "0 4px 12px rgba(30,40,80,0.24)" : "0 2px 6px rgba(0,0,0,0.06)",
        }}
      >
        <TableContainer>
          <Table
            sx={{
              "& .MuiTableCell-root": {
                color: tableText,
                background: tableBg,
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Reference No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sales Channel</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SKUs</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created At</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Updated By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                      <InlineLoader message="Loading dispatch logs..." />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: "center", py: 3 }}>
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{log.ref_no}</TableCell>
                    <TableCell>{log.customer_name}</TableCell>
                    <TableCell>{log.sales_channel}</TableCell>
                    <TableCell>{log.sku_count}</TableCell>
                    <TableCell>
                      <span
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          log.status.toLowerCase() === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : log.status.toLowerCase() === "dispatched"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {log.status?.toUpperCase() ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(log.created_at)}</TableCell>
                    <TableCell>{log.created_by}</TableCell>
                    <TableCell>{log.updated_by}</TableCell>
                    <TableCell>
                      <Tooltip title="View order details">
                        <IconButton size="small" onClick={() => handleViewDetails(log.ref_no)} sx={{ color: tableText }}>
                          <VisibilityIcon />
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
          rowsPerPageOptions={[10]}
          sx={{
            bgcolor: isDark ? "#101828" : "#ffffff",
            color: tableText,
          }}
        />
      </Paper>

      <DispatchLogDetailsModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        logDetails={selectedLogDetails}
      />
    </Container>
  );
};

export default DispatchLogs;
