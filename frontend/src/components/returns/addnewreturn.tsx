import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../features/backend/api';
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
import { SelectChangeEvent } from '@mui/material/Select';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const RETURN_REF_CACHE_KEY = 'new-return-ref-no';
let returnRefMemoryCache = '';

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

const styles = {
  inputField1: {
    minWidth: '320px',
    maxWidth: '420px'
  }
};

const STATUS_OPTIONS = [
  "RTO DELIVERED - DAMAGED CONDITION",
  "RTO DELIVERED - PERFECT CONDITION"
];

type ReturnItem = {
  id: number;
  skuRef: string;
  skuFixed: string;
  additionalDetails: string;
  selectedSku: any;
  status: string;
};

const defaultItems = (): ReturnItem[] => ([{
  id: 1,
  skuRef: '',
  skuFixed: '',
  additionalDetails: '',
  selectedSku: null,
  status: '',
}]);

const NewReturn = () => {
  const navigate = useNavigate();
  const isDark = useTailwindDarkMode();

  const getCachedRefNumber = () => {
    if (returnRefMemoryCache) {
      return returnRefMemoryCache;
    }
    if (typeof window === 'undefined') {
      return '';
    }
    const storedRef = window.sessionStorage.getItem(RETURN_REF_CACHE_KEY) || '';
    if (storedRef) {
      returnRefMemoryCache = storedRef;
    }
    return storedRef;
  };

  const cacheRefNumber = (refNumber: string) => {
    returnRefMemoryCache = refNumber;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(RETURN_REF_CACHE_KEY, refNumber);
    }
  };

  const pageHeaderColor = isDark ? "#fff" : "#353535";
  const subHeaderColor = isDark ? "#bfc7d1" : "#757575";
  const cardBgColor = isDark ? "#181F2A" : "#fff";
  const cardBorderColor = isDark ? "#232d46" : "#f3f3f3";
  const paperBgColor = isDark ? "#101828" : "transparent";
  const tableHeadBg = isDark ? "#232d46" : "#f9fafb";
  const tableTextColor = isDark ? "#fff" : "#353535";
  const selectBg = isDark ? "#232d46" : "#fff";
  const selectColor = isDark ? "#fff" : "#222";
  const buttonColor = "#465fff";
  const errorColor = "#f44336";
  const textFieldBg = isDark ? "#232d46" : "#fff";

  const [isLoading, setIsLoading] = useState(false);
  const [isRefLoading, setIsRefLoading] = useState(!getCachedRefNumber());
  const [formData, setFormData] = useState({
    refNumber: getCachedRefNumber(),
    customerName: '',
    salesChannel: '',
  });
  const [items, setItems] = useState<ReturnItem[]>(defaultItems());
  const [fixedSkus, setFixedSkus] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchReturnRefNo = async () => {
    setIsRefLoading(true);
    try {
      const refData = await apiRequest<{ status: string; data: { return_ref_no: string } }>("/returns/ref-no");
      if (refData.status === "success" && refData.data?.return_ref_no) {
        cacheRefNumber(refData.data.return_ref_no);
        setFormData(prev => ({
          ...prev,
          refNumber: refData.data.return_ref_no
        }));
      }
    } catch (error: any) {
      setMessage('Error fetching return reference: ' + error.message);
    } finally {
      setIsRefLoading(false);
    }
  };

  const fetchSkuOptions = async () => {
    try {
      const skusData = await apiRequest<{ status: string; data: Array<{ sku_fixed: string; product_name: string; label: string }> }>("/returns/sku-options");
      if (skusData.status === "success" && skusData.data) {
        setFixedSkus(skusData.data);
      }
    } catch (error: any) {
      setMessage('Error fetching SKU options: ' + error.message);
    }
  };

  // Fetch new ref number and SKUs in parallel so one call does not block the other.
  const fetchInitialData = async () => {
    await Promise.all([fetchReturnRefNo(), fetchSkuOptions()]);
  };

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line
  }, []);

  const displayRefNumber = formData.refNumber || (isRefLoading ? 'Generating...' : '');

  // Separate handlers for TextField and Select for strict TS
  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: name === 'customerName' ? value.toUpperCase() : value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: String(value).toUpperCase()
    }));
  };

  const handleSkuChange = (index: number, newValue: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      selectedSku: newValue,
      skuFixed: newValue ? newValue.sku_fixed : '',
      additionalDetails: ''
    };
    setItems(newItems);
  };

  const handleStatusChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].status = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: prev.length + 1,
        skuRef: '',
        skuFixed: '',
        additionalDetails: '',
        selectedSku: null,
        status: '',
      }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    if (!formData.customerName.match(/^[A-Z ]+$/)) {
      setMessage('Customer name must contain only alphabets.');
      return false;
    }
    if (!formData.salesChannel) {
      setMessage('Sales channel is required.');
      return false;
    }
    if (items.some(item => !item.skuRef || !item.skuFixed)) {
      setMessage('SKU Reference and Fixed SKU are mandatory.');
      return false;
    }
    if (items.some(item => !item.status)) {
      setMessage('Status is mandatory for each SKU.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;
    setIsLoading(true);
    setMessage('');
    setSuccessMessage('');
    try {
      const payload = {
        return_ref_no: formData.refNumber,
        customer_name: formData.customerName,
        sales_channel: formData.salesChannel,
        items: items.map(item => ({
          sku_ref: item.skuRef,
          sku_fixed: item.skuFixed,
          additional_details: item.additionalDetails,
          status: item.status,
        })),
      };

      const data = await apiRequest<{ status: string; message?: string }>("/returns", {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (data.status === 'success') {
        setSuccessMessage('Return Created Successfully!');
        // Reset form after short delay
        setTimeout(() => {
          setFormData({
            refNumber: getCachedRefNumber(),
            customerName: '',
            salesChannel: '',
          });
          setItems(defaultItems());
          setSuccessMessage('');
          fetchInitialData(); // get new ref number
        }, 1200);
      } else {
        setMessage('Error: ' + (data.message || 'Unable to create return.'));
      }
    } catch (error: any) {
      setMessage('Error submitting form: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      bgcolor: paperBgColor,
      minHeight: '10vh'
    }}>
      <Container
        maxWidth={false}
        sx={{
          width: 1500,
          maxWidth: 1500,
          py: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/returns')} disabled={isLoading || Boolean(successMessage)} sx={{ color: pageHeaderColor }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" className="app-page-title" sx={{ fontWeight: 800, color: pageHeaderColor }}>Add - New Return</Typography>
              <Typography variant="subtitle2" sx={{ color: subHeaderColor }}>

              </Typography>
            </Box>
          </Box>
        </Box>

        <Paper sx={{
          p: { xs: 2, sm: 3 },
          backgroundColor: cardBgColor,
          borderRadius: 2,
          border: `1px solid ${cardBorderColor}`,
          boxShadow: '0 2px 5px rgba(0,0,0,0.10)'
        }}>
          <form onSubmit={handleSubmit}>
            {/* Return Details */}
            <Box mb={3}>
              <Typography variant="h6" sx={{ mb: 2, color: pageHeaderColor }}>Return Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Return Reference Number"
                    value={displayRefNumber}
                    disabled
                    InputProps={{
                      style: {
                        color: pageHeaderColor,
                        background: textFieldBg,
                      }
                    }}
                    InputLabelProps={{
                      style: { color: subHeaderColor }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleTextInputChange}
                    required
                    error={!!formData.customerName && !formData.customerName.match(/^[A-Z ]+$/)}
                    helperText={!!formData.customerName && !formData.customerName.match(/^[A-Z ]+$/) ? "Only alphabets allowed" : ""}
                    disabled={isLoading || Boolean(successMessage)}
                    InputProps={{
                      style: { color: pageHeaderColor, background: textFieldBg }
                    }}
                    InputLabelProps={{
                      style: { color: subHeaderColor }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl
                    required
                    sx={{
                      width: 450,
                      "& .MuiInputBase-root": {
                        background: selectBg,
                        color: selectColor
                      },
                      "& .MuiInputLabel-root": {
                        color: subHeaderColor
                      },
                      "& .MuiSvgIcon-root": {
                        color: selectColor
                      }
                    }}>
                    <InputLabel>Sales Channel</InputLabel>
                    <Select
                      name="salesChannel"
                      value={formData.salesChannel}
                      onChange={handleSelectChange}
                      label="Sales Channel"
                      disabled={isLoading || Boolean(successMessage)}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            bgcolor: selectBg,
                            color: selectColor
                          }
                        }
                      }}
                    >
                      <MenuItem value="AMAZON">AMAZON</MenuItem>
                      <MenuItem value="FLIPKART">FLIPKART</MenuItem>
                      <MenuItem value="MEESHO">MEESHO</MenuItem>
                      <MenuItem value="OFFLINE">OFFLINE</MenuItem>
                      <MenuItem value="WEBSITE">WEBSITE</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* SKU Details */}
            <Box mb={3}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: pageHeaderColor }}>SKU Details</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addItem}
                  variant="contained"
                  sx={{ backgroundColor: buttonColor, color: '#fff' }}
                  disabled={isLoading || Boolean(successMessage)}
                >
                  Add SKU
                </Button>
              </Box>
              <TableContainer>
                <Table
                  sx={{
                    '& .MuiTableCell-root': {
                      color: tableTextColor,
                      background: cardBgColor,
                    }
                  }}
                >
                  <TableHead>
                    <TableRow sx={{ background: tableHeadBg }}>
                      <TableCell sx={{ color: tableTextColor }}>No.</TableCell>
                      <TableCell sx={{ color: tableTextColor }}>SKU Reference</TableCell>
                      <TableCell sx={{ color: tableTextColor }}>Fixed SKU</TableCell>
                      <TableCell sx={{ color: tableTextColor }}>Additional Details</TableCell>
                      <TableCell sx={{ color: tableTextColor }}>Status*</TableCell>
                      <TableCell sx={{ color: tableTextColor }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={item.skuRef}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index].skuRef = e.target.value.toUpperCase();
                              setItems(newItems);
                            }}
                            placeholder="Enter SKU"
                            required
                            disabled={isLoading || Boolean(successMessage)}
                            InputProps={{
                              style: { color: tableTextColor }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Autocomplete
                            size="small"
                            options={fixedSkus}
                            value={item.selectedSku}
                            onChange={(_, newValue) => handleSkuChange(index, newValue)}
                            getOptionLabel={(option: any) => option ? `${option.sku_fixed} - ${option.product_name}` : ''}
                            sx={styles.inputField1}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Search SKU"
                                required
                                InputProps={{
                                  ...params.InputProps,
                                  style: { color: tableTextColor, background: selectBg }
                                }}
                              />
                            )}
                            disabled={isLoading || Boolean(successMessage)}
                            PaperComponent={(props) => (
                              <Paper
                                {...props}
                                sx={{
                                  bgcolor: cardBgColor,
                                  color: tableTextColor
                                }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={item.additionalDetails}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index].additionalDetails = e.target.value;
                              setItems(newItems);
                            }}
                            placeholder="Additional Details (Optional)"
                            disabled={isLoading || Boolean(successMessage)}
                            InputProps={{
                              style: { color: tableTextColor, background: textFieldBg }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl
                            required
                            size="small"
                            sx={{
                              minWidth: 220,
                              background: selectBg,
                              color: selectColor,
                              "& .MuiInputLabel-root": { color: subHeaderColor },
                              "& .MuiSvgIcon-root": { color: selectColor }
                            }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                              value={item.status}
                              label="Status"
                              onChange={e => handleStatusChange(index, e.target.value as string)}
                              disabled={isLoading || Boolean(successMessage)}
                              MenuProps={{
                                PaperProps: {
                                  sx: {
                                    bgcolor: selectBg,
                                    color: selectColor
                                  }
                                }
                              }}
                              required
                            >
                              {STATUS_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1 || isLoading || Boolean(successMessage)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color={errorColor}>*Status is required for each SKU</Typography>
            </Box>

            {/* Form Actions */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/returns')}
                disabled={isLoading || Boolean(successMessage)}
                sx={{ color: buttonColor, borderColor: buttonColor }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                sx={{ backgroundColor: buttonColor, color: '#fff' }}
                disabled={isLoading || Boolean(successMessage)}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
              >
                {isLoading ? 'Processing...' : 'Create Return'}
              </Button>
            </Box>
          </form>
        </Paper>

        {/* Error Message */}
        {message && (
          <Box sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: message.includes('Error') ? errorColor : '#4caf50',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            zIndex: 1000
          }}>
            <Typography>{message}</Typography>
          </Box>
        )}

        {/* Success Message */}
        {successMessage && (
          <Box sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            color: '#353535',
            padding: '36px 48px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            zIndex: 2000,
            textAlign: 'center'
          }}>
            <Typography variant="h4" sx={{ color: '#4caf50', mb: 2 }}>
              {successMessage}
            </Typography>
            <CircularProgress sx={{ mt: 2 }} />
          </Box>
        )}

        {/* Backdrop for disabling UI during loading/success */}
        <Backdrop
          open={isLoading || Boolean(successMessage)}
          sx={{ zIndex: 1200, color: '#fff' }}
        />
      </Container>
    </Box>
  );
};

export default NewReturn;