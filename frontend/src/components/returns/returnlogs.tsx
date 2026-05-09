import { useState, useEffect, useRef } from "react";
import { apiRequest } from "../../features/backend/api";

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
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

// Tailwind dark mode detection hook
const useTailwindDarkMode = () => {
  const [isDark, setIsDark] = useState(() =>
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
};

function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).replace(",", "");
}

const fetchLogs = async (search: string, from: string, to: string) => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (from) params.append("from", from);
  if (to) params.append("to", to);

  return apiRequest<{ status: string; data: any[] }>(`/returns/logs?${params.toString()}`);
};

const fetchLogDetails = async (return_ref_no: string) => {
  return apiRequest<{ status: string; data: any[] }>(`/returns/logs/${encodeURIComponent(return_ref_no)}`);
};

const ReturnLogs: React.FC = () => {
  const isDark = useTailwindDarkMode();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [details, setDetails] = useState<any[]>([]);
  const [modalRef, setModalRef] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Theme variables
  const pageBg = isDark ? "#101828" : "#f9fafb";
  const tableBg = isDark ? "#181F2A" : "#fff";
  const tableText = isDark ? "#fff" : "#353535";
  const inputBg = isDark ? "#232d46" : "#fff";
  const headerText = isDark ? "#fff" : "#222";

  // Real-time search and filter (debounced)
  useEffect(() => {
    setLoading(true);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchLogs(search, from, to).then(data => {
        setLogs(data.status === "success" ? data.data : []);
        setLoading(false);
      }).catch(() => {
        setLogs([]);
        setLoading(false);
      });
    }, 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
    // eslint-disable-next-line
  }, [search, from, to]);

  const handleOpenModal = async (return_ref_no: string) => {
    setModalOpen(true);
    setModalRef(return_ref_no);
    setModalLoading(true);
    setDetails([]);
    try {
      const data = await fetchLogDetails(return_ref_no);
      setDetails(data.status === "success" ? data.data : []);
    } catch {
      setDetails([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalRef("");
    setDetails([]);
  };

  return (
    <Container maxWidth="xl" sx={{ bgcolor: pageBg, minHeight: "100vh", py: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{ color: headerText }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" className="app-page-title" sx={{ color: headerText, fontWeight: 800 }}>
          RTO Orders Logs
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: tableBg }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{
              bgcolor: inputBg,
              borderRadius: 2,
              minWidth: 220,
              '& .MuiInputBase-root': {
                color: tableText,
                bgcolor: inputBg
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? "#232d46" : "#c4c4c4"
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
          <TextField
            size="small"
            label="From Date"
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              bgcolor: inputBg,
              borderRadius: 2,
              minWidth: 160,
              '& .MuiInputBase-root': {
                color: tableText,
                bgcolor: inputBg
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? "#232d46" : "#c4c4c4"
              }
            }}
          />
          <TextField
            size="small"
            label="To Date"
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              bgcolor: inputBg,
              borderRadius: 2,
              minWidth: 160,
              '& .MuiInputBase-root': {
                color: tableText,
                bgcolor: inputBg
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? "#232d46" : "#c4c4c4"
              }
            }}
          />
        </Box>
      </Paper>

      {/* Table */}
      <Paper sx={{
        bgcolor: tableBg,
        color: tableText,
        borderRadius: 3,
        boxShadow: isDark
          ? "0 4px 12px rgba(30,40,80,0.24)"
          : "0 2px 6px rgba(0,0,0,0.06)",
      }}>
        <TableContainer>
          <Table sx={{
            '& .MuiTableCell-root': {
              color: tableText,
              background: tableBg,
            }
          }}>
            <TableHead>
              <TableRow>
                <TableCell>Sr. No.</TableCell>
                <TableCell>Return Ref No</TableCell>
                <TableCell>Customer Name</TableCell>
                <TableCell>Sales Channel</TableCell>
                <TableCell>No. of Items</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, idx) => (
                  <TableRow key={log.return_ref_no}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{log.return_ref_no}</TableCell>
                    <TableCell>{log.customer_name}</TableCell>
                    <TableCell>{log.sales_channel}</TableCell>
                    <TableCell>{log.items_count}</TableCell>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                    <TableCell>{log.created_by}</TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleOpenModal(log.return_ref_no)}
                        >
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
      </Paper>

      {/* Details Modal */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="lg" fullWidth>
        <DialogTitle>
          Return Details ({modalRef})
        </DialogTitle>
        <DialogContent>
          {modalLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sr. No.</TableCell>
                    <TableCell>Return Ref No</TableCell>
                    <TableCell>Customer Name</TableCell>
                    <TableCell>Sales Channel</TableCell>
                    <TableCell>SKU Ref</TableCell>
                    <TableCell>SKU Fixed</TableCell>
                    <TableCell>Product Name</TableCell>
                    <TableCell>Additional Details</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell>Created By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center">
                        No details found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    details.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{item.return_ref_no}</TableCell>
                        <TableCell>{item.customer_name}</TableCell>
                        <TableCell>{item.sales_channel}</TableCell>
                        <TableCell>{item.sku_ref}</TableCell>
                        <TableCell>{item.sku_fixed}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{item.additional_details}</TableCell>
                        <TableCell>{String(item.status || "").toUpperCase()}</TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell>{item.created_by}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReturnLogs;