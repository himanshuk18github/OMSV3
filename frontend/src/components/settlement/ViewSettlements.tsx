import  { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Chip
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../features/backend/api";

// Add an index signature so we can index by string
const PLATFORM_COLORS: Record<string, string> = {
  Amazon: "#4860fd",
  Flipkart: "#00aaff",
  Meesho: "#FFD600",
  Offline: "#FF3040",
  Website: "#f59e42",
  Others: "#888888",
};
function colorOfPlatform(platform: string) {
  return PLATFORM_COLORS[platform] || PLATFORM_COLORS.Others;
}
const GLASS_STYLE = {
  backdropFilter: "blur(14px) saturate(170%)",
  background: "linear-gradient(108deg, rgba(255,255,255,0.82) 0%, rgba(240,245,255,0.76) 100%)",
  boxShadow: "0 8px 30px 0 rgba(70,95,255,0.10)",
  borderRadius: "18px",
  transition: "background 0.2s",
};
interface CombinedRow {
  srNo: number;
  ref_no: string;
  order_id: string;
  platform: string;
  amount: number;
  entered_by: string;
  entered_at: string;
  transaction_date: string;
  remarks: string;
  num_entries: number;
  allEntries: EntryDetail[];
}
interface EntryDetail {
  ref_no?: string;
  transaction_date: string;
  amount: number;
  remarks: string;
  settlement_type: string;
  entered_by: string;
  entered_at: string;
}
const PAGE_SIZE = 10;
function formatDateDDMMYYYY(date: string) {
  if (!date) return "";
  if (date.length === 10 && date[4] === "-")
    return [date.slice(8, 10), date.slice(5, 7), date.slice(0, 4)].join("/");
  return date;
}
export default function ViewSettlements() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupEntries, setPopupEntries] = useState<EntryDetail[]>([]);
  const [popupOrderId, setPopupOrderId] = useState("");
  const [popupPlatform, setPopupPlatform] = useState("");
  useEffect(() => {
    const fetchRows = async () => {
      try {
        const encodedSearch = encodeURIComponent(search);
        const data = await apiRequest<{
          status: string;
          data: { data: any[] };
        }>(`/settlements?page=${page + 1}&per_page=${PAGE_SIZE}&search=${encodedSearch}`);

        let srNo = page * PAGE_SIZE + 1;
        const combinedRows: CombinedRow[] = [];
        for (const entry of data.data?.data || []) {
          const platform = entry.sales_channel && entry.sales_channel.trim() ? entry.sales_channel : "Others";
          const detailsData = await apiRequest<{
            status: string;
            data: { entries: EntryDetail[] };
          }>(`/settlements/history?order_id=${encodeURIComponent(entry.order_id)}&sales_channel=${encodeURIComponent(platform)}`);

          const allEntries = detailsData.data?.entries || [];
          combinedRows.push({
            srNo: srNo++,
            ref_no: entry.ref_no,
            order_id: entry.order_id,
            platform,
            amount: Number(entry.amount),
            entered_by: entry.entered_by ?? "",
            entered_at: entry.entered_at ?? "",
            transaction_date: entry.transaction_date ?? "",
            remarks: entry.remarks ?? "",
            num_entries: allEntries.length,
            allEntries: allEntries
          });
        }
        setRows(combinedRows);
      } catch (e) {
        setRows([]);
      }
    };
    fetchRows();
  }, [page, search]);
  const handleViewDetail = (row: CombinedRow) => {
    setPopupOrderId(row.order_id);
    setPopupPlatform(row.platform);
    setPopupEntries(row.allEntries);
    setPopupOpen(true);
  };
  return (
    <Box sx={{ p: { xs: 1, md: 3 }, minHeight: "100vh", bgcolor: "#f5f6fb" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ minWidth: 80 }}
        >
          Back
        </Button>
        <Typography variant="h4" className="app-page-title" sx={{ fontWeight: 800 }}>
          View Settlements
        </Typography>
      </Box>
      <Box sx={{ mb: 2, display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          size="small"
          label="Search (Order ID / Platform)"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(0);
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 320 }, background: "#fff", borderRadius: 2 }}
        />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sr.No.</TableCell>
              <TableCell>Order ID</TableCell>
              <TableCell>Ref No</TableCell>
              <TableCell>Transaction Date</TableCell>
              <TableCell>Platform</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Entered By</TableCell>
              <TableCell>Entered Date</TableCell>
              <TableCell>Remarks</TableCell>
              <TableCell align="center">Entries</TableCell>
              <TableCell align="center">Detail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.ref_no}>
                <TableCell>{row.srNo}</TableCell>
                <TableCell>{row.order_id}</TableCell>
                <TableCell>{row.ref_no}</TableCell>
                <TableCell>{formatDateDDMMYYYY(row.transaction_date)}</TableCell>
                <TableCell>
                  <Chip
                    label={row.platform}
                    size="small"
                    sx={{
                      bgcolor: colorOfPlatform(row.platform),
                      fontWeight: 700,
                      color: (row.platform === "Meesho" || row.platform === "Website") ? "#212121" : "#fff"
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography color={row.amount < 0 ? "red" : "success.main"} fontWeight={700}>
                    ₹ {row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                </TableCell>
                <TableCell>{row.entered_by}</TableCell>
                <TableCell>{row.entered_at?.replace("T", " ").slice(0, 19)}</TableCell>
                <TableCell sx={{ maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.remarks}</TableCell>
                <TableCell align="center"><b>{row.num_entries}</b></TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleViewDetail(row)}>
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            ...GLASS_STYLE,
            minHeight: 340,
            mt: 4,
            background: "#fafbff"
          }
        }}
      >
        <DialogTitle sx={{ py: 1.2, background: "#f5f8fd", pl: 2 }}>
          <Chip
            label={popupPlatform}
            size="small"
            sx={{
              bgcolor: colorOfPlatform(popupPlatform),
              fontWeight: 700,
              color: popupPlatform === "Meesho" || popupPlatform === "Website" ? "#212121" : "#fff",
              mr: 2
            }}
          />
          Details for Order <b>{popupOrderId}</b>
        </DialogTitle>
        <DialogContent dividers sx={{ ...GLASS_STYLE, px: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Entry #</TableCell>
                <TableCell>Transaction Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Remarks</TableCell>
                <TableCell>Settlement Type</TableCell>
                <TableCell>Entered By</TableCell>
                <TableCell>Entered Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {popupEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">No entries found.</TableCell>
                </TableRow>
              ) : (
                popupEntries.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{formatDateDDMMYYYY(entry.transaction_date)}</TableCell>
                    <TableCell>
                      <Typography color={entry.amount < 0 ? "red" : "success.main"}>
                        ₹ {Number(entry.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.remarks}</TableCell>
                    <TableCell>{entry.settlement_type}</TableCell>
                    <TableCell>{entry.entered_by}</TableCell>
                    <TableCell>{entry.entered_at?.replace("T", " ").slice(0, 19)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions sx={{ p: 1.6, background: "#fbfcfd" }}>
          <Button onClick={() => setPopupOpen(false)} color="primary" variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}