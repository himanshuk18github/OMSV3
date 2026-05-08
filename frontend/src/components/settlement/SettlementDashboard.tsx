import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AuthContext } from "../../context/AuthContext";
import { apiRequest } from "../../features/backend/api";

dayjs.extend(utc);
dayjs.extend(timezone);

const salesChannels = ["Amazon", "Flipkart", "Meesho", "Offline", "Website", "Others"];
const settlementTypes = ["Neft", "PG Settlement", "Cash", "UPI", "Adjustment"];
const SETTLEMENT_REF_CACHE_KEY = "settlement-ref-no-draft";

type SettlementHistoryRow = {
  id: number;
  ref_no: string;
  transaction_date: string;
  amount: number;
  remarks: string;
  settlement_type: string;
  entered_by: string;
  entered_at: string;
};

type AuthUser = {
  username?: string | null;
  name?: string | null;
};

const toIST = () => dayjs().tz("Asia/Kolkata");

const formatDate = (value: string) => {
  if (!value) {
    return "";
  }
  return dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : value;
};

const formatDateTime = (value: string) => {
  if (!value) {
    return "";
  }
  return dayjs(value).isValid() ? dayjs(value).tz("Asia/Kolkata").format("DD/MM/YYYY HH:mm:ss") : value;
};

export default function SettlementDashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) as { user: AuthUser | null };
  const didRequestRef = useRef(false);

  const getCachedRefNo = () => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.sessionStorage.getItem(SETTLEMENT_REF_CACHE_KEY) || "";
  };

  const [refNo, setRefNo] = useState(getCachedRefNo());
  const [refLoading, setRefLoading] = useState(!getCachedRefNo());
  const [transactionDate, setTransactionDate] = useState<Dayjs | null>(toIST());
  const [orderId, setOrderId] = useState("");
  const [salesChannel, setSalesChannel] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [settlementType, setSettlementType] = useState("");
  const [historyRows, setHistoryRows] = useState<SettlementHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentIST, setCurrentIST] = useState(toIST());

  const enteredBy = useMemo(() => user?.username || user?.name || "Unknown", [user]);

  const historySum = useMemo(
    () => historyRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [historyRows]
  );

  const fetchRefNo = async () => {
    setRefLoading(true);
    try {
      const response = await apiRequest<{ status: string; data: { ref_no: string } }>("/settlements/ref-no");
      const nextRef = response.data?.ref_no || "";
      setRefNo(nextRef);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SETTLEMENT_REF_CACHE_KEY, nextRef);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to generate settlement reference.");
      setRefNo("");
    } finally {
      setRefLoading(false);
    }
  };

  const fetchHistory = async (nextOrderId: string, nextChannel: string) => {
    if (!nextOrderId.trim() || !nextChannel) {
      setHistoryRows([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const encodedOrder = encodeURIComponent(nextOrderId.trim());
      const encodedChannel = encodeURIComponent(nextChannel);
      const response = await apiRequest<{
        status: string;
        data: { entries: SettlementHistoryRow[]; sum: number };
      }>(`/settlements/history?order_id=${encodedOrder}&sales_channel=${encodedChannel}`);
      setHistoryRows(response.data?.entries || []);
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (refNo) {
      setRefLoading(false);
      return;
    }

    if (didRequestRef.current) {
      return;
    }

    didRequestRef.current = true;
    fetchRefNo();
  }, [refNo]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentIST(toIST());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchHistory(orderId, salesChannel);
  }, [orderId, salesChannel]);

  const validateForm = (): string | null => {
    if (refLoading || !refNo) {
      return "Settlement reference is still generating. Please wait.";
    }
    if (!transactionDate) {
      return "Transaction date is required.";
    }
    if (!orderId.trim()) {
      return "Order ID is required.";
    }
    if (!salesChannel) {
      return "Sales channel is required.";
    }
    if (amount.trim() === "" || Number.isNaN(Number(amount))) {
      return "Amount is required and can be positive or negative.";
    }
    if (!settlementType) {
      return "Settlement type is required.";
    }
    return null;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ref_no: refNo,
        transaction_date: transactionDate?.format("YYYY-MM-DD"),
        order_id: orderId.trim(),
        sales_channel: salesChannel,
        amount: Number(amount),
        remarks: remarks.trim(),
        settlement_type: settlementType,
        entered_by: enteredBy,
        entered_at: currentIST.format("YYYY-MM-DD HH:mm:ss"),
      };

      const response = await apiRequest<{ status: string; message?: string }>("/settlements", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.status === "success") {
        setSuccess("Settlement entry saved successfully.");
        setAmount("");
        setRemarks("");
        setSettlementType("");
        setTransactionDate(toIST());
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(SETTLEMENT_REF_CACHE_KEY);
        }
        await Promise.all([fetchRefNo(), fetchHistory(orderId, salesChannel)]);
      } else {
        setError(response.message || "Unable to save settlement.");
      }
    } catch (err: any) {
      setError(err?.message || "Unable to save settlement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100vh", bgcolor: "#f3f5fb" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Typography variant="h5" className="app-page-title" sx={{ fontWeight: 800 }}>
            Settlement Entry
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={7}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              <Box component="form" onSubmit={onSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Settlement Ref No"
                      value={refLoading ? "Generating..." : refNo}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Date of Transaction"
                      value={transactionDate}
                      onChange={(value) => setTransactionDate(value)}
                      format="DD/MM/YYYY"
                      slotProps={{ textField: { fullWidth: true, required: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Order ID"
                      value={orderId}
                      onChange={(event) => setOrderId(event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      select
                      label="Sales Channel"
                      value={salesChannel}
                      onChange={(event) => setSalesChannel(event.target.value)}
                    >
                      {salesChannels.map((channel) => (
                        <MenuItem key={channel} value={channel}>{channel}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      label="Amount"
                      type="number"
                      inputProps={{ step: "0.01" }}
                      placeholder="Positive or negative value"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      select
                      label="Settlement Type"
                      value={settlementType}
                      onChange={(event) => setSettlementType(event.target.value)}
                    >
                      {settlementTypes.map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      label="Remarks"
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Entered By" value={enteredBy} disabled />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="IST Time"
                      value={currentIST.format("DD/MM/YYYY HH:mm:ss")}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button type="submit" variant="contained" disabled={saving || refLoading}>
                      {saving ? "Saving..." : "Save Settlement"}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper sx={{ p: 3, borderRadius: 2, minHeight: 420 }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                Previous Settlements
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Real-time matched view for same Order ID and Sales Channel.
              </Typography>

              {historyLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : historyRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No previous settlements found.
                </Typography>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Ref No</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{formatDate(row.transaction_date)}</TableCell>
                            <TableCell>{row.ref_no}</TableCell>
                            <TableCell align="right">{Number(row.amount).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Total Previous Amount: {historySum.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last Updated (IST): {historyRows[0] ? formatDateTime(historyRows[0].entered_at) : "-"}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
}