import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../features/backend/api";

import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

const columns = [
  "Sr.No.",
  "Product Id",
  "SKU Fixed",
  "Product Name",
  "Opening Stock",
  "Stock Update",
  "Stock Out",
  "Closing Stock",
];

type ClosingStockRow = {
  id: number;
  product_id: string;
  sku_fixed: string;
  product_name: string;
  item_type?: string;
  opening_stock: number;
  stock_update: number;
  stock_out: number;
  closing_stock: number;
};

const ViewClosingStock = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ClosingStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState("all");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const normalized = search.trim().toUpperCase();
    if (!normalized) {
      return data;
    }

    return data.filter((row) =>
      [row.product_id, row.sku_fixed, row.product_name]
        .join(" ")
        .toUpperCase()
        .includes(normalized)
    );
  }, [data, search]);

  const fetchClosingStock = async (searchValue?: string) => {
    setLoading(true);
    setError("");
    try {
      const query = (searchValue ?? search).trim();
      const params = new URLSearchParams();
      if (query) {
        params.set("search", query);
      }
      if (itemType !== "all") {
        params.set("item_type", itemType);
      }
      const encoded = params.toString() ? `?${params.toString()}` : "";
      const response = await apiRequest<{ status: string; data: ClosingStockRow[] }>(
        `/inventory/closing-stock${encoded}`
      );
      setData(response.data || []);
    } catch (err: any) {
      setData([]);
      setError(err?.message || "Failed to load closing stock data.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchClosingStock();
    // eslint-disable-next-line
  }, [itemType]);

  return (
    <Container maxWidth="xl" sx={{ pt: 4, pb: 4 }}>
      <Box display="flex" alignItems="center" mb={2} gap={2}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Typography variant="h5" className="app-page-title" fontWeight={800} sx={{ flex: 1 }}>
          Closing Stock Summary
        </Typography>
        <Button
          variant="outlined"
          onClick={() => fetchClosingStock()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      <Box mb={2} display="flex" gap={2} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Item Type</InputLabel>
          <Select
            label="Item Type"
            value={itemType}
            onChange={(event) => setItemType(String(event.target.value))}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="own">OWN</MenuItem>
            <MenuItem value="vendor">VENDOR</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Search"
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search any column"
        />
      </Box>
      <Paper sx={{ p: 2, minHeight: 400 }}>
        {loading ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minHeight={300}
          >
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Box display="flex" alignItems="center" justifyContent="center" minHeight={300}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell
                      key={col}
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: "#3641f5",
                        color: "#fff",
                        border: "1px solid #333",
                        fontSize: 14,
                      }}
                    >
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      No data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row, i) => (
                    <TableRow key={row.id || i}>
                      <TableCell sx={{ border: "1px solid #bbb" }}>{i + 1}</TableCell>
                      <TableCell sx={{ border: "1px solid #bbb" }}>{row.product_id}</TableCell>
                      <TableCell sx={{ border: "1px solid #bbb" }}>{row.sku_fixed?.toUpperCase()}</TableCell>
                      <TableCell sx={{ border: "1px solid #bbb" }}>{row.product_name?.toUpperCase()}</TableCell>
                      <TableCell sx={{ border: "1px solid #bbb" }}>{row.opening_stock}</TableCell>
                      <TableCell sx={{ border: "1px solid #bbb" }}>{row.stock_update}</TableCell>
                      <TableCell sx={{ border: "1px solid #bbb" }}>{row.stock_out}</TableCell>
                      <TableCell sx={{ border: "1px solid #bbb" }}>{row.closing_stock}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default ViewClosingStock;