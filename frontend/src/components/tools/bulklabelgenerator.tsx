import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../../apicallconfig';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Backdrop from '@mui/material/Backdrop';
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';

// Dark mode detection (fixed hook)
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

const delimiters = [
  { value: '', label: 'Blank' },
  { value: '-', label: 'Hyphen (-)' },
  { value: '/', label: 'Slash (/)' }
];
const labelSizes = [
  { value: '2x1', label: '2 x 1 inch' },
  { value: '4x6', label: '4 x 6 inch (10 per page)' }
];

const BulkLabelGenerator = () => {
  const navigate = useNavigate();
  const isDark = useTailwindDarkMode();

  const [skuInitials, setSkuInitials] = useState("");
  const [delimiter, setDelimiter] = useState("");
  const [medValue, setMedValue] = useState("");
  const [startSerial, setStartSerial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [labelSize, setLabelSize] = useState("2x1");
  const [marketingPrint, setMarketingPrint] = useState(false);
  const [showMrp, setShowMrp] = useState(false);
  const [mrpValue, setMrpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [message, setMessage] = useState("");

  // Theming/colors
  const cardBgColor = isDark ? "#181F2A" : "#fff";
  const cardBorderColor = isDark ? "#232d46" : "#f3f3f3";
  const paperBgColor = isDark ? "#101828" : "#f5f5f5";
  const buttonColor = "#465fff";
  const errorColor = "#f44336";
  const pageHeaderColor = isDark ? "#fff" : "#353535";

  // Validation
  function validateForm() {
    if (!skuInitials.trim() || skuInitials.length > 4) {
      setMessage("SKU initials required (max 4 chars).");
      return false;
    }
    if (!medValue.trim()) {
      setMessage("MED Value is required.");
      return false;
    }
    if (!/^\d{1,6}$/.test(startSerial.trim())) {
      setMessage("Start serial must be 1-6 digits.");
      return false;
    }
    if (!/^\d{1,3}$/.test(quantity.trim()) || Number(quantity) < 1 || Number(quantity) > 500) {
      setMessage("Quantity should be between 1 and 500.");
      return false;
    }
    if (showMrp && !mrpValue.trim()) {
      setMessage("Enter MRP value or uncheck Show MRP.");
      return false;
    }
    return true;
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!validateForm() || isLoading) return;

    setIsLoading(true);
    try {
      // Assemble FormData (for PHP backend)
      const formData = new FormData();
      formData.append('sku_initials', skuInitials.toUpperCase());
      formData.append('delimiter', delimiter);
      formData.append('med_value', medValue.toUpperCase());
      formData.append('start_serial', startSerial.padStart(3, "0"));
      formData.append('quantity', quantity);
      formData.append('label_size', labelSize);
      if (marketingPrint) formData.append('marketing_print', '1');
      if (showMrp) formData.append('show_mrp', '1');
      if (showMrp) formData.append('mrp_value', mrpValue);

      const res = await fetch(`${API_BASE_URL}/labelgen.php`, {
        method: "POST",
        body: formData
      });

      const ct = res.headers.get("Content-Type");
      if (!res.ok) {
        throw new Error("Server error: " + (await res.text()));
      }
      if (!ct?.toLowerCase().includes("pdf")) {
        throw new Error("Unexpected response. Not a PDF.\n" + (await res.text()));
      }
      // Download the returned PDF
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `labels_${skuInitials}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate("/tools");
      }, 2000);

    } catch (err: any) {
      setMessage("Error: " + (err.message || "Could not generate labels."));
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
      minHeight: '100vh'
    }}>
      <Container maxWidth={false} sx={{ width: 700, maxWidth: 700, py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/tools')} sx={{ color: pageHeaderColor }} disabled={isLoading || showSuccess}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: pageHeaderColor }}>Bulk Label Generator</Typography>
        </Box>

        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            backgroundColor: cardBgColor,
            borderRadius: 2,
            border: `1px solid ${cardBorderColor}`,
            boxShadow: '0 2px 5px rgba(0,0,0,0.10)'
          }}
        >
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={2}>

              <TextField
                label="SKU Initials (max 4)"
                inputProps={{ maxLength: 4, style: { textTransform: "uppercase" } }}
                value={skuInitials}
                onChange={e => setSkuInitials(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase())}
                required
                disabled={isLoading || showSuccess}
              />

              <FormControl>
                <InputLabel>Delimiter</InputLabel>
                <Select
                  label="Delimiter"
                  value={delimiter}
                  onChange={e => setDelimiter(e.target.value)}
                  disabled={isLoading || showSuccess}
                >
                  {delimiters.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="MED Value"
                value={medValue}
                onChange={e => setMedValue(e.target.value.toUpperCase())}
                inputProps={{ style: { textTransform: "uppercase" } }}
                required
                disabled={isLoading || showSuccess}
              />

              <TextField
                label="Start Serial (min 3 digits)"
                type="number"
                inputProps={{ min: 1, maxLength: 6 }}
                value={startSerial}
                onChange={e => setStartSerial(e.target.value.replace(/\D/g, ''))}
                required
                disabled={isLoading || showSuccess}
              />

              <TextField
                label="Quantity (max 500)"
                type="number"
                inputProps={{ min: 1, max: 500 }}
                value={quantity}
                onChange={e => setQuantity(e.target.value.replace(/\D/g, ''))}
                required
                disabled={isLoading || showSuccess}
              />

              <FormControl>
                <InputLabel>Label Size</InputLabel>
                <Select
                  label="Label Size"
                  value={labelSize}
                  onChange={e => setLabelSize(e.target.value)}
                  disabled={isLoading || showSuccess}
                >
                  {labelSizes.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Checkbox checked={marketingPrint} onChange={e => setMarketingPrint(e.target.checked)} disabled={isLoading || showSuccess} />
                }
                label="Marketing Print"
              />
              <FormControlLabel
                control={
                  <Checkbox checked={showMrp} onChange={e => { setShowMrp(e.target.checked); if (!e.target.checked) setMrpValue(""); }} disabled={isLoading || showSuccess} />
                }
                label="Show MRP"
              />

              {showMrp && (
                <TextField
                  label="MRP Value"
                  value={mrpValue}
                  onChange={e => setMrpValue(e.target.value)}
                  required
                  disabled={isLoading || showSuccess}
                />
              )}

              {/* Actions */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/tools')}
                  disabled={isLoading || showSuccess}
                  sx={{ color: buttonColor, borderColor: buttonColor }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ backgroundColor: buttonColor, color: '#fff' }}
                  disabled={isLoading || showSuccess}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
                >
                  {isLoading ? 'Processing...' : 'Generate PDF Labels'}
                </Button>
              </Box>

            </Box>
          </form>
        </Paper>

        {/* Success Backdrop */}
        <Backdrop
          sx={{
            color: '#fff',
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)'
          }}
          open={showSuccess}
        >
          <Box
            sx={{
              backgroundColor: '#fff',
              padding: '40px',
              borderRadius: '8px',
              textAlign: 'center',
              maxWidth: '400px',
              position: 'relative'
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ color: '#353535' }}>
              Success!
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ color: '#353535' }}>
              Labels Generated & PDF Downloaded!
            </Typography>
            <Typography variant="body1" sx={{ color: '#666' }}>
              Redirecting...
            </Typography>
            <CircularProgress
              size={20}
              sx={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            />
          </Box>
        </Backdrop>

        {/* Error / Info Message */}
        {message && (
          <Box sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: message.startsWith("Error") ? errorColor : '#4caf50',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            zIndex: 1000
          }}>
            <Typography>{message}</Typography>
          </Box>
        )}

      </Container>
    </Box>
  );
};

export default BulkLabelGenerator;