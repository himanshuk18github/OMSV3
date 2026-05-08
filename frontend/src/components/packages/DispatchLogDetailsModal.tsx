import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Tooltip,
  styled,
  useTheme,
  Button,
} from "@mui/material";
import { Close as CloseIcon, Download as DownloadIcon } from "@mui/icons-material";
import API_BASE_URL from "../../apicallconfig";

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

interface LogDetailsModalProps {
  open: boolean;
  onClose: () => void;
  logDetails: LogDetails | null;
}

const StyledDialog = styled(Dialog)(() => ({
  "& .MuiDialog-paper": {
    minWidth: "80vw",
    maxHeight: "88vh",
  },
}));

const StyledDialogTitle = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: "14px 22px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}));

function getAuthToken(): string | null {
  return sessionStorage.getItem("oms_auth_token") || localStorage.getItem("oms_auth_token");
}

const DispatchLogDetailsModal = ({ open, onClose, logDetails }: LogDetailsModalProps) => {
  const theme = useTheme();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const isDark = theme.palette.mode === "dark";
  const tableBg = isDark ? "#181f2a" : "#ffffff";
  const tableText = isDark ? "#f3f4f6" : "#353535";

  useEffect(() => {
    if (!open) {
      setDownloadError("");
      setDownloadLoading(false);
    }
  }, [open]);

  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) {
      return "-";
    }

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

  const downloadInvoice = async () => {
    if (!logDetails) {
      return;
    }

    setDownloadLoading(true);
    setDownloadError("");

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        Accept: "application/pdf,application/octet-stream",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/dispatches/${logDetails.id}/invoice`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Unable to download invoice.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${logDetails.ref_no}_invoice.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      setDownloadError(error?.message || "Unable to download invoice.");
    } finally {
      setDownloadLoading(false);
    }
  };

  if (!logDetails) {
    return null;
  }

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <StyledDialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Dispatch Details - Ref No: {logDetails.ref_no}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </StyledDialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 1.2,
            mb: 2,
            p: 2,
            borderRadius: 2,
            border: isDark ? "1px solid #273449" : "1px solid #e5e7eb",
            backgroundColor: tableBg,
          }}
        >
          <Typography><b>Customer:</b> {logDetails.customer_name}</Typography>
          <Typography><b>Sales Channel:</b> {logDetails.sales_channel}</Typography>
          <Typography><b>Status:</b> {logDetails.status}</Typography>
          <Typography><b>No. of Items:</b> {logDetails.item_count}</Typography>
          <Typography><b>Order Date:</b> {formatDateTime(logDetails.order_date)}</Typography>
          <Typography><b>Dispatch Date:</b> {formatDateTime(logDetails.dispatch_date)}</Typography>
          <Typography><b>Created At:</b> {formatDateTime(logDetails.created_at)}</Typography>
          <Typography><b>Updated At:</b> {formatDateTime(logDetails.updated_at)}</Typography>
          <Typography><b>Created By:</b> {logDetails.created_by}</Typography>
          <Typography><b>Updated By:</b> {logDetails.updated_by}</Typography>
        </Box>

        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h6" sx={{ color: tableText, fontWeight: 700 }}>
            Item Details
          </Typography>

          {logDetails.has_invoice && (
            <Tooltip title="View uploaded invoice securely">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadInvoice}
                  disabled={downloadLoading}
                >
                  {downloadLoading ? "Preparing..." : "View Document"}
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>

        {downloadError && (
          <Typography sx={{ color: "#ef4444", mb: 1.5, fontWeight: 600 }}>{downloadError}</Typography>
        )}

        <Paper elevation={0}>
          <TableContainer sx={{ maxHeight: "calc(88vh - 340px)" }}>
            <Table
              stickyHeader
              size="medium"
              sx={{
                "& .MuiTableCell-root": {
                  color: tableText,
                  background: tableBg,
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ width: "80px", fontWeight: 700 }}>Sr No.</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SKU Scanned</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fixed SKU</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Additional Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logDetails.items.map((detail, index) => (
                  <TableRow key={detail.id} hover>
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell>{detail.sku_scanned}</TableCell>
                    <TableCell>{detail.fixed_sku}</TableCell>
                    <TableCell align="center">{detail.quantity}</TableCell>
                    <TableCell>{detail.additional_details || "-"}</TableCell>
                  </TableRow>
                ))}

                {logDetails.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No item rows found for this dispatch.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </DialogContent>
    </StyledDialog>
  );
};

export default DispatchLogDetailsModal;
