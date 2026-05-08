import { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SearchIcon from "@mui/icons-material/Search";
import API_BASE_URL from "../../apicallconfig";
import InlineLoader from "../common/InlineLoader";
import dayjs from "dayjs";

interface DocRow {
  id: number;
  ref_no: string;
  original_file_name: string;
  remarks: string;
  uploaded_by: string;
  uploaded_at: string;
  doc_date: string;
}

const getYears = (docs: DocRow[]) => {
  const years = new Set<string>();
  docs.forEach(d => {
    if (d.doc_date) years.add(dayjs(d.doc_date).year().toString());
  });
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
};

const getMonths = (docs: DocRow[], filterYear?: string) => {
  const months = new Set<string>();
  docs.forEach(d => {
    if (
      d.doc_date &&
      (!filterYear || dayjs(d.doc_date).year().toString() === filterYear)
    ) {
      months.add(dayjs(d.doc_date).format("MM"));
    }
  });
  return Array.from(months).sort();
};

const monthNames: { [key: string]: string } = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
};

const ROWS_PER_PAGE = 10;

function wrapFileName(name: string) {
  // Break only at spaces or hyphens or underscores or dots, but not mid-word
  // This regex will insert a <wbr/> after each such character for HTML
  // We'll use dangerouslySetInnerHTML, safe for file names
  return name.replace(/([ _.-])/g, "$1<wbr/>");
}

const ViewDoc = () => {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const token = sessionStorage.getItem('oms_auth_token') || localStorage.getItem('oms_auth_token');
    setLoading(true);
    fetch(`${API_BASE_URL}/documents`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setDocs(data?.status === 'success' ? (data.data || []) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openDocument = async (docId: number) => {
    const token = sessionStorage.getItem('oms_auth_token') || localStorage.getItem('oms_auth_token');
    const res = await fetch(`${API_BASE_URL}/documents/${docId}/file`, {
      headers: {
        Accept: '*/*',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => window.URL.revokeObjectURL(url), 120000);
  };

  // Filter logic
  const years = getYears(docs);
  const months = getMonths(docs, filterYear);

  const filteredDocs = docs.filter((d) => {
    const matchesSearch =
      d.ref_no.toLowerCase().includes(search.toLowerCase()) ||
      d.original_file_name.toLowerCase().includes(search.toLowerCase()) ||
      d.remarks.toLowerCase().includes(search.toLowerCase()) ||
      d.uploaded_by.toLowerCase().includes(search.toLowerCase());

    let matchesYear = true;
    let matchesMonth = true;
    if (filterYear) matchesYear = !!(d.doc_date && dayjs(d.doc_date).year().toString() === filterYear);
    if (filterMonth) matchesMonth = !!(d.doc_date && dayjs(d.doc_date).format("MM") === filterMonth);
    return matchesSearch && matchesYear && matchesMonth;
  });

  // Pagination
  const paginatedDocs = filteredDocs.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  useEffect(() => {
    setPage(0);
  }, [search, filterYear, filterMonth]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 1, bgcolor: "#fff" }}>
        <Box display="flex" gap={2} alignItems="center" mb={2}>
          <SearchIcon fontSize="small" />
          <input
            style={{
              width: 200,
              border: "1px solid #c9d4e3",
              borderRadius: 4,
              padding: "6px 10px",
              fontSize: 15,
              fontFamily: "inherit",
              outline: "none",
              background: "#fff"
            }}
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 100, maxWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={filterYear}
              label="Year"
              onChange={(e) => {
                setFilterYear(e.target.value);
                setFilterMonth("");
              }}
              style={{ width: 100 }}
            >
              <MenuItem value="">All</MenuItem>
              {years.map((y) => (
                <MenuItem key={y} value={y}>{y}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100, maxWidth: 100 }}>
            <InputLabel>Month</InputLabel>
            <Select
              value={filterMonth}
              label="Month"
              onChange={e => setFilterMonth(e.target.value)}
              style={{ width: 100 }}
            >
              <MenuItem value="">All</MenuItem>
              {months.map((m) => (
                <MenuItem key={m} value={m}>
                  {monthNames[m] || m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {(search || filterYear || filterMonth) && (
            <Button
              size="small"
              onClick={() => {
                setSearch("");
                setFilterYear("");
                setFilterMonth("");
              }}
              variant="outlined"
            >
              Clear
            </Button>
          )}
        </Box>
        <Paper elevation={0} sx={{ borderRadius: 1, overflow: "hidden", bgcolor: "#fff" }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={250}>
              <InlineLoader message="Loading documents..." />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small" sx={{
                  "& td, & th": { fontSize: 14, fontFamily: "monospace" }
                }}>
                  <TableHead>
                    <TableRow sx={{ background: "#f0f3f8" }}>
                      <TableCell sx={{ fontWeight: 600 }}>Ref No</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>File Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Uploaded By</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Uploaded At</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Doc Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>View</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedDocs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No documents found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDocs.map((doc) => (
                        <TableRow key={doc.ref_no} hover>
                          <TableCell>{doc.ref_no}</TableCell>
                          <TableCell
                            style={{
                              whiteSpace: "normal",
                              wordBreak: "break-word"
                            }}
                          >
                            <span
                              dangerouslySetInnerHTML={{
                                __html: wrapFileName(doc.original_file_name)
                              }}
                            />
                          </TableCell>
                          <TableCell style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                            {doc.remarks}
                          </TableCell>
                          <TableCell>{doc.uploaded_by}</TableCell>
                          <TableCell>{doc.uploaded_at}</TableCell>
                          <TableCell>
                            {doc.doc_date ? dayjs(doc.doc_date).format("DD/MM/YYYY") : ""}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="primary"
                              onClick={() => void openDocument(doc.id)}
                              size="small"
                            >
                              <FolderOpenIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredDocs.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={ROWS_PER_PAGE}
                rowsPerPageOptions={[ROWS_PER_PAGE]}
                labelRowsPerPage=""
                sx={{
                  ".MuiTablePagination-toolbar": { minHeight: 32, height: 32, fontSize: 13 },
                  ".MuiTablePagination-selectLabel, .MuiTablePagination-input, .MuiTablePagination-displayedRows": {
                    fontSize: 13
                  }
                }}
              />
            </>
          )}
        </Paper>
      </Paper>
    </Container>
  );
};

export default ViewDoc;