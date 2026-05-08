import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Avatar,
  LinearProgress,
  IconButton
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PersonIcon from '@mui/icons-material/Person';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from "dayjs";
import { AuthContext } from '../../context/AuthContext';
import API_BASE_URL from '../../apicallconfig';

const allowedTypes = [
  "image/png", "image/jpeg", "image/jpg", "image/heic",
  "application/pdf", "video/mp4"
];

const allowedExt = ".png,.jpg,.jpeg,.heic,.pdf,.mp4";

const AddNewDoc = () => {
  const { user } = useContext(AuthContext) as any;
  const [refNo, setRefNo] = useState("");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [file, setFile] = useState<File | null>(null);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const authHeaders = () => {
    const token = sessionStorage.getItem('oms_auth_token') || localStorage.getItem('oms_auth_token');
    return {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch next ref_no from API
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/documents/next-ref`, { headers: authHeaders() });
        const data = await resp.json();
        if (data.status === 'success') setRefNo(data?.data?.ref_no || '00001');
        else setRefNo("00001");
      } catch {
        setRefNo("00001");
      }
    })();
  }, []);

  // Drag and drop logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    validateAndSetFile(dropped);
  };

  // File select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const fileObj = e.target.files?.[0];
    if (!fileObj) return;
    validateAndSetFile(fileObj);
  };

  function validateAndSetFile(fileObj: File) {
    if (!allowedTypes.includes(fileObj.type)) {
      setError("File type not allowed.");
      return;
    }
    if (fileObj.size > 200 * 1024 * 1024) {
      setError("File size exceeds 200 MB.");
      return;
    }
    setFile(fileObj);
  }

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  function formatDateForDB(date: Dayjs | null) {
    if (!date) return "";
    return date.format("YYYY-MM-DD");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setUploadProgress(0);

    if (!file) return setError("Please select a file to upload.");
    if (!remarks.trim()) return setError("Remarks are required.");
    if (!date) return setError("Date is required.");
    if (!refNo) return setError("Reference number not generated.");

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("ref_no", refNo);
      formData.append("doc_date", formatDateForDB(date));
      formData.append("remarks", remarks.trim());
      formData.append("document", file);

      const res = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });

      const result = await res.json().catch(() => ({}));
      setIsSubmitting(false);
      setUploadProgress(0);

      if (!res.ok || result?.status !== 'success') {
        setError(result?.message || 'Upload failed.');
        return;
      }

      setSuccess("Document uploaded successfully.");
      setFile(null);
      setRemarks("");
      if (fileInput.current) fileInput.current.value = "";

      const nextResp = await fetch(`${API_BASE_URL}/documents/next-ref`, { headers: authHeaders() });
      const nextData = await nextResp.json();
      setRefNo(nextData?.data?.ref_no || "");
    } catch (err: any) {
      setIsSubmitting(false);
      setUploadProgress(0);
      setError("Upload failed. Please try again.");
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="sm" sx={{ py: 5, minHeight: "10vh", display: "flex", alignItems: "center" }}>
        <Paper
          elevation={4}
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: 5,
            width: "100%",
            maxWidth: 500,
            background: "rgba(255,255,255,0.8)",
            boxShadow: "0 6px 32px 0 rgba(70, 95, 255, 0.14)"
          }}
        >
          <Typography
            variant="h4"
            className="app-page-title"
            fontWeight={900}
            align="center"
            sx={{
              letterSpacing: 1,
              mb: 4,
              color: "#2335b6",
              fontFamily: "Google Sans,Roboto,Arial,sans-serif"
            }}
          >
            Upload Document
          </Typography>
          <form onSubmit={handleSubmit} encType="multipart/form-data" autoComplete="off">
            <Stack spacing={3}>
              <TextField
                label="Ref No"
                value={refNo}
                InputProps={{
                  readOnly: true,
                  style: {
                    fontWeight: 700,
                    letterSpacing: 3,
                    fontSize: 20,
                    color: "#465fff"
                  }
                }}
                variant="outlined"
                fullWidth
                required
              />
              <DatePicker
                label="Date *"
                value={date}
                format="DD/MM/YYYY"
                onChange={setDate}
                disableFuture={false}
                slotProps={{
                  textField: {
                    required: true,
                    fullWidth: true,
                  }
                }}
              />

              <Box
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                sx={{
                  border: "2.5px dashed #465fff",
                  borderRadius: 3,
                  p: 2.5,
                  minHeight: 110,
                  background: "#f4f7ff",
                  transition: "border 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 1.5,
                  outline: file ? "2.5px solid #465fff" : ""
                }}
              >
                <input
                  type="file"
                  hidden
                  accept={allowedExt}
                  ref={fileInput}
                  onChange={handleFileChange}
                  id="file-upload"
                />
                {!file ? (
                  <>
                    <CloudUploadIcon sx={{ fontSize: 42, color: "#465fff" }} />
                    <Button
                      variant="contained"
                      color="primary"
                      sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                        px: 3,
                        py: 1.2,
                        textTransform: "none",
                        fontSize: 16,
                        mt: 0.7
                      }}
                      onClick={() => fileInput.current?.click()}
                    >
                      Select or Drag File Here
                    </Button>
                  </>
                ) : (
                  <Box display="flex" alignItems="center" gap={2} width="100%" justifyContent="center">
                    <Avatar sx={{ bgcolor: "#465fff" }}>
                      <CloudUploadIcon />
                    </Avatar>
                    <Typography variant="body1" sx={{ maxWidth: 180, wordBreak: "break-all", color: "#2335b6" }}>
                      {file.name}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={handleRemoveFile}
                      sx={{ minWidth: 0, px: 1 }}
                    >
                      Remove
                    </Button>
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  Allowed: png, jpg, jpeg, heic, pdf, mp4 &nbsp;|&nbsp; Max 200MB &nbsp;|&nbsp; One file per Ref No
                </Typography>
                {uploadProgress > 0 && (
                  <Box sx={{ width: "100%", mt: 1 }}>
                    <LinearProgress variant="determinate" value={uploadProgress} />
                  </Box>
                )}
              </Box>

              <TextField
                label="Remarks *"
                value={remarks}
                onChange={e => setRemarks(e.target.value.slice(0, 200))}
                inputProps={{ maxLength: 200 }}
                required
                multiline
                minRows={2}
                fullWidth
                sx={{
                  background: "#f4f7ff",
                  borderRadius: 2
                }}
              />
              <TextField
                label="Username"
                value={user?.username || user?.login || "Unknown"}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <IconButton tabIndex={-1} edge="start">
                      <PersonIcon sx={{ color: "#465fff" }} />
                    </IconButton>
                  ),
                  style: { fontWeight: 600 }
                }}
                fullWidth
                sx={{
                  background: "#f4f7ff",
                  borderRadius: 2
                }}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                sx={{
                  fontWeight: 700,
                  py: 1.5,
                  fontSize: 17,
                  borderRadius: 3,
                  textTransform: "none",
                  boxShadow: "0 2px 12px 0 rgba(70,95,255,0.08), 0 1.5px 7px 0 rgba(70,95,255,0.13)"
                }}
              >
                {isSubmitting ? "Uploading..." : "Upload Document"}
              </Button>
            </Stack>
          </form>
          {success && <Typography color="success.main" sx={{ mt: 2, fontWeight: 600 }}>{success}</Typography>}
          {error && <Typography color="error.main" sx={{ mt: 2, fontWeight: 600 }}>{error}</Typography>}
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default AddNewDoc;