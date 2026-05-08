import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../../apicallconfig';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

type DispatchSkuOption = {
  product_id: string;
  fixed_sku: string;
  product_name: string;
  mrp: number;
  label: string;
};

type DispatchItem = {
  id: number;
  sku_scanned: string;
  fixed_sku: string;
  additional_details: string;
  source_type: 'OWN' | 'VENDOR';
  vendor_name: string;
  selectedSku: DispatchSkuOption | null;
};

type DispatchVendorOption = {
  id: number;
  name: string;
};

type DispatchFormState = {
  ref_no: string;
  customer_name: string;
  sales_channel: string;
};

type ApiEnvelope<T> = {
  status: string;
  data: T;
};

const styles = {
  inputField: {
      width: '100%',
      minWidth: '360px',
  },
};

const emptyItem = (id: number): DispatchItem => ({
  id,
  sku_scanned: '',
  fixed_sku: '',
  additional_details: '',
  source_type: 'OWN',
  vendor_name: '',
  selectedSku: null,
});

function getAuthToken(): string | null {
  return sessionStorage.getItem('oms_auth_token') || localStorage.getItem('oms_auth_token');
}

async function fetchWithAuth<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});
  headers.set('Accept', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data as T;
}

const NewDispatch = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<DispatchFormState>({
    ref_no: '',
    customer_name: '',
    sales_channel: '',
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [invoiceTempId, setInvoiceTempId] = useState('');
  const [invoiceUploaded, setInvoiceUploaded] = useState(false);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [items, setItems] = useState<DispatchItem[]>([emptyItem(1)]);
  const [skuOptions, setSkuOptions] = useState<DispatchSkuOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<DispatchVendorOption[]>([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [skuBootstrapped, setSkuBootstrapped] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const invoiceInputRef = useRef<HTMLInputElement | null>(null);

  const pageHeaderColor = '#353535';
  const subHeaderColor = '#6c7382';
  const cardBgColor = '#ffffff';
  const cardBorderColor = '#e8edf4';
  const paperBgColor = 'transparent';
  const tableHeadBg = '#f1f1f1';
  const tableTextColor = '#1f2937';
  const buttonColor = '#2f5af3';

  const canSubmit = useMemo(() => !isLoading && !showSuccess, [isLoading, showSuccess]);

  const fetchRefNo = useCallback(async () => {
    const data = await fetchWithAuth<ApiEnvelope<{ ref_no: string }>>(`${API_BASE_URL}/dispatches/ref-no`);
    setFormData((prev) => ({ ...prev, ref_no: data.data.ref_no }));
  }, []);

  const fetchSkuOptions = useCallback(async (query = '') => {
    setLoadingSkus(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set('q', query.trim().toUpperCase());
      }

      const url = params.toString()
        ? `${API_BASE_URL}/dispatches/sku-options?${params.toString()}`
        : `${API_BASE_URL}/dispatches/sku-options`;

      const data = await fetchWithAuth<ApiEnvelope<DispatchSkuOption[]>>(url);
      setSkuOptions(data.data || []);
      setSkuBootstrapped(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to fetch SKU options.');
    } finally {
      setLoadingSkus(false);
    }
  }, []);

  const fetchVendorOptions = useCallback(async () => {
    try {
      const data = await fetchWithAuth<ApiEnvelope<Array<{ id: number; name: string }>>>(`${API_BASE_URL}/vendors/all`);
      setVendorOptions((data.data || []).map((vendor) => ({ id: vendor.id, name: String(vendor.name || '').toUpperCase() })));
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to fetch vendor options.');
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setInitialLoading(true);
      try {
        await fetchRefNo();
        fetchSkuOptions('');
        fetchVendorOptions();
      } catch (error: any) {
        setErrorMessage(error?.message || 'Unable to initialize dispatch form.');
      } finally {
        setInitialLoading(false);
      }
    };

    bootstrap();
  }, [fetchRefNo, fetchSkuOptions, fetchVendorOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSkuOptions(skuSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [skuSearch, fetchSkuOptions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setAttachment(null);
      setInvoiceTempId('');
      setInvoiceUploaded(false);
      setUploadProgress(0);
      if (invoiceInputRef.current) {
        invoiceInputRef.current.value = '';
      }
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Invalid invoice file type. Allowed: JPG, PNG, PDF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Invoice file too large. Maximum allowed size is 5MB.');
      return;
    }

    setAttachment(file);
    setInvoiceTempId('');
    setInvoiceUploaded(false);
    setUploadProgress(0);
    if (invoiceInputRef.current) {
      invoiceInputRef.current.value = '';
    }
    void uploadInvoiceFile(file);
  };

  const uploadInvoiceFile = async (file: File) => {
    if (!formData.ref_no) {
      setErrorMessage('Reference number is not ready yet. Please wait and try again.');
      return;
    }

    setIsUploadingInvoice(true);
    setErrorMessage('');
    setUploadProgress(0);
    setInvoiceTempId('');
    setInvoiceUploaded(false);

    try {
      const token = getAuthToken();
      const formDataPayload = new FormData();
      formDataPayload.append('invoice', file);
      formDataPayload.append('ref_no', formData.ref_no);

      const responseData = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/dispatches/upload-temp-invoice`);
        xhr.responseType = 'json';

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response || {});
            return;
          }

          const message = xhr.response?.message || 'Unable to upload invoice file.';
          reject(new Error(message));
        };

        xhr.onerror = () => reject(new Error('Network error while uploading invoice file.'));

        xhr.setRequestHeader('Accept', 'application/json');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formDataPayload);
      });

      const tempId = responseData?.data?.temp_id;
      if (!tempId) {
        throw new Error('Invoice upload completed but temp id was not returned.');
      }

      setInvoiceTempId(String(tempId));
      setInvoiceUploaded(true);
      setUploadProgress(100);
      setErrorMessage('');
    } catch (error: any) {
      setAttachment(null);
      setInvoiceTempId('');
      setInvoiceUploaded(false);
      setUploadProgress(0);
      if (invoiceInputRef.current) {
        invoiceInputRef.current.value = '';
      }
      setErrorMessage(error?.message || 'Unable to upload invoice file.');
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem(prev.length + 1)]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, patch: Partial<DispatchItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const validateForm = (): boolean => {
    if (!formData.ref_no) {
      setErrorMessage('Reference number is missing. Please refresh the page.');
      return false;
    }

    if (!formData.customer_name.trim()) {
      setErrorMessage('Customer name is required.');
      return false;
    }

    if (!formData.sales_channel.trim()) {
      setErrorMessage('Sales channel is required.');
      return false;
    }

    if (!invoiceTempId) {
      setErrorMessage('Please upload the invoice first.');
      return false;
    }

    const invalidRow = items.find((item) => {
      if (!item.sku_scanned.trim() || !item.fixed_sku.trim()) {
        return true;
      }

      if (item.source_type === 'VENDOR' && !item.vendor_name.trim()) {
        return true;
      }

      return false;
    });

    if (invalidRow) {
      setErrorMessage('Every row must include SKU Scanned and Fixed SKU.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || !validateForm() || !invoiceTempId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = new FormData();
      payload.append('ref_no', formData.ref_no);
      payload.append('customer_name', formData.customer_name.trim().toUpperCase());
      payload.append('sales_channel', formData.sales_channel.trim().toUpperCase());
      payload.append('invoice_temp_id', invoiceTempId);

      items.forEach((item, index) => {
        payload.append(`items[${index}][sku_scanned]`, item.sku_scanned.trim().toUpperCase());
        payload.append(`items[${index}][fixed_sku]`, item.fixed_sku.trim().toUpperCase());
        payload.append(`items[${index}][additional_details]`, item.additional_details.trim());
        payload.append(`items[${index}][source_type]`, item.source_type);
        payload.append(`items[${index}][vendor_name]`, item.vendor_name.trim().toUpperCase());
      });

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/dispatches`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: payload,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || 'Unable to create dispatch order.');
      }

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/packages');
      }, 1800);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to create dispatch order.');
    } finally {
      setIsLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', bgcolor: paperBgColor }}>
      <Container maxWidth={false} sx={{ width: 1500, maxWidth: 1500, py: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/packages')} disabled={showSuccess} sx={{ color: pageHeaderColor }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: pageHeaderColor }}>
                New Dispatch
              </Typography>
              <Typography variant="subtitle2" sx={{ color: subHeaderColor }}>
                Ref no is safely reserved for your session and stays unchanged until submit or expiry.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            backgroundColor: cardBgColor,
            borderRadius: 2,
            border: `1px solid ${cardBorderColor}`,
            boxShadow: '0 4px 14px rgba(31, 41, 55, 0.06)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <Box mb={3}>
              <Typography variant="h6" sx={{ mb: 2, color: pageHeaderColor }}>
                Order Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Reference Number" value={formData.ref_no} disabled />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customer_name: e.target.value.toUpperCase(),
                      }))
                    }
                    required
                    disabled={showSuccess}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Sales Channel</InputLabel>
                    <Select
                      value={formData.sales_channel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sales_channel: String(e.target.value).toUpperCase(),
                        }))
                      }
                      label="Sales Channel"
                      disabled={showSuccess}
                    >
                      <MenuItem value="AMAZON">Amazon</MenuItem>
                      <MenuItem value="FLIPKART">Flipkart</MenuItem>
                      <MenuItem value="MEESHO">Meesho</MenuItem>
                      <MenuItem value="OFFLINE">Offline</MenuItem>
                      <MenuItem value="WEBSITE">Website</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <Box mb={3}>
              <Typography variant="h6" sx={{ mb: 2, color: pageHeaderColor }}>
                Invoice Attachment
              </Typography>
              <input
                ref={invoiceInputRef}
                accept=".jpg,.jpeg,.png,.pdf"
                style={{ display: 'none' }}
                id="dispatch-invoice"
                type="file"
                onChange={handleFileChange}
                disabled={showSuccess || isUploadingInvoice}
              />
              <label htmlFor="dispatch-invoice">
                <Button variant="outlined" component="span" startIcon={<AttachFileIcon />} sx={{ mr: 2 }} disabled={showSuccess || isUploadingInvoice}>
                  {attachment ? 'Change Invoice' : 'Upload Invoice'}
                </Button>
              </label>
              <Typography variant="caption" color="text.secondary">
                Stored privately outside public html. Allowed: JPG, PNG, PDF (max 5MB).
              </Typography>
              {attachment && (
                <Typography variant="body2" sx={{ mt: 1, color: tableTextColor, fontWeight: 600 }}>
                  Selected file: {attachment.name}
                </Typography>
              )}
              {isUploadingInvoice && (
                <Box sx={{ mt: 1.5 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="caption" color="text.secondary">
                    Uploading invoice... {uploadProgress}%
                  </Typography>
                </Box>
              )}
              {invoiceUploaded && invoiceTempId && !isUploadingInvoice && (
                <Alert severity="success" sx={{ mt: 1.5 }}>
                  Invoice uploaded securely. Dispatch creation is now enabled.
                </Alert>
              )}
            </Box>

            <Box mb={3}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: pageHeaderColor }}>
                  SKU Rows
                </Typography>
                <Button startIcon={<AddIcon />} onClick={addItem} variant="contained" sx={{ backgroundColor: buttonColor }} disabled={showSuccess}>
                  Add Row
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: tableHeadBg }}>
                      <TableCell>No.</TableCell>
                      <TableCell>SKU Scanned (Mandatory)</TableCell>
                      <TableCell>Fixed SKU (Mandatory)</TableCell>
                      <TableCell>Source Type</TableCell>
                      <TableCell>Vendor Name</TableCell>
                      <TableCell>Additional Details (Optional)</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ color: tableTextColor }}>{index + 1}</TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={item.sku_scanned}
                            onChange={(e) => updateItem(index, { sku_scanned: e.target.value.toUpperCase() })}
                            placeholder="RAW SCANNED SKU"
                            required
                            disabled={showSuccess}
                          />
                        </TableCell>
                        <TableCell>
                          <Autocomplete
                            size="small"
                            options={skuOptions}
                            value={item.selectedSku}
                            loading={loadingSkus}
                            onInputChange={(_, value, reason) => {
                              if (reason === 'input') {
                                setSkuSearch(value);
                              }
                            }}
                            onChange={(_, newValue) =>
                              updateItem(index, {
                                selectedSku: newValue,
                                fixed_sku: newValue?.fixed_sku?.toUpperCase() || '',
                              })
                            }
                            getOptionLabel={(option) => option.label}
                            isOptionEqualToValue={(option, value) => option.fixed_sku === value.fixed_sku}
                            sx={styles.inputField}
                            openOnFocus
                            disablePortal
                            PopperComponent={(props) => <Popper {...props} placement="bottom-start" style={{ zIndex: 1600 }} />}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                fullWidth
                                placeholder="PRODUCT_ID - FIXED_SKU - NAME (MRP)"
                                required
                                InputProps={{
                                  ...params.InputProps,
                                  endAdornment: (
                                    <>
                                      {loadingSkus ? <CircularProgress color="inherit" size={16} /> : null}
                                      {params.InputProps.endAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                            disabled={showSuccess}
                            PaperComponent={(props) => <Paper {...props} sx={{ maxHeight: 280 }} />}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={item.source_type}
                              onChange={(e) =>
                                updateItem(index, {
                                  source_type: e.target.value as 'OWN' | 'VENDOR',
                                  vendor_name: e.target.value === 'OWN' ? '' : item.vendor_name,
                                })
                              }
                              disabled={showSuccess}
                            >
                              <MenuItem value="OWN">OWN</MenuItem>
                              <MenuItem value="VENDOR">VENDOR</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Autocomplete
                            size="small"
                            options={vendorOptions}
                            getOptionLabel={(option) => option.name}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            value={vendorOptions.find((vendor) => vendor.name === item.vendor_name) || null}
                            onChange={(_, newValue) => updateItem(index, { vendor_name: newValue?.name || '' })}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder={item.source_type === 'VENDOR' ? 'SELECT ACTIVE VENDOR' : 'OWN'}
                                required={item.source_type === 'VENDOR'}
                              />
                            )}
                            disabled={showSuccess || item.source_type !== 'VENDOR'}
                            sx={styles.inputField}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={item.additional_details}
                            onChange={(e) => updateItem(index, { additional_details: e.target.value })}
                            placeholder="Optional details"
                            disabled={showSuccess}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => removeItem(index)} disabled={items.length === 1 || showSuccess} color="error" size="small">
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/packages')} disabled={!canSubmit}>
                Cancel
              </Button>
              {invoiceUploaded && (
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ backgroundColor: buttonColor }}
                  disabled={!canSubmit || isUploadingInvoice}
                  startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : undefined}
                >
                  {isLoading ? 'Saving...' : 'Create Dispatch'}
                </Button>
              )}
            </Box>

            {!invoiceUploaded && !isUploadingInvoice && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">Upload the invoice first. The Create Dispatch button will appear after upload completes.</Alert>
              </Box>
            )}

            {!skuBootstrapped && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Loading SKU catalog in background...
                </Typography>
              </Box>
            )}
          </form>
        </Paper>

        <Backdrop
          sx={{
            color: '#fff',
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(2px)',
          }}
          open={showSuccess}
        >
          <Box
            sx={{
              backgroundColor: '#ffffff',
              padding: '34px',
              borderRadius: '14px',
              textAlign: 'center',
              maxWidth: '430px',
              border: '1px solid #dbeafe',
              animation: 'dispatch-success-rise 340ms ease-out',
              '@keyframes dispatch-success-rise': {
                from: { transform: 'translateY(10px)', opacity: 0 },
                to: { transform: 'translateY(0)', opacity: 1 },
              },
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 84, color: '#22c55e', mb: 1 }} />
            <Typography variant="h5" sx={{ color: '#0f172a', fontWeight: 800 }}>
              Dispatch Created
            </Typography>
            <Typography variant="body1" sx={{ color: '#475569', mt: 1 }}>
              Saved successfully. Redirecting to package list.
            </Typography>
          </Box>
        </Backdrop>

        <Snackbar open={Boolean(errorMessage)} autoHideDuration={5000} onClose={() => setErrorMessage('')}>
          <Alert severity="error" variant="filled" onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default NewDispatch;
