import { Box, Typography, Card, CardContent, Button } from "@mui/material";
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import CropIcon from '@mui/icons-material/Crop';
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

// (Re-use your dark mode hook)
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

const tools = [
  {
    key: "bulk-label-generator",
    title: "Bulk Label Generator",
    description: "Generate labels in bulk from your package/order data, fast and flexible.",
    icon: <LabelOutlinedIcon fontSize="large" />,
    route: "/tools/bulk-label-generator"
  },
  {
    key: "bulk-pdf-cropper",
    title: "Bulk Pdf Cropper",
    description: "Crop PDFs intelligently and in bulk. Perfect for label or invoice refining.",
    icon: <CropIcon fontSize="large" />,
    route: "/tools/bulk-pdf-cropper"
  }
];

const ToolsPage = () => {
  const isDark = useTailwindDarkMode();
  const navigate = useNavigate();

  const cardBg = isDark ? "#0f172a" : "#fff";
  const cardBorder = isDark ? "1px solid #232d46" : "1px solid #e0e0e0";
  const cardText = isDark ? "#fff" : "#222";

  return (
    <div
      style={{
        minHeight: "auto",
        background: "transparent",
        padding: "0",
        transition: "background 0.3s"
      }}
    >
      <div className="px-4 w-full">
        <Typography
          variant="h4"
          className="app-page-title"
          fontWeight={800}
          mb={6}
          sx={{ color: cardText }}
        >
          Toolkit
        </Typography>
        <Box
          display="flex"
          gap={4}
          flexWrap={{ xs: 'wrap', md: 'nowrap' }}
          flexDirection={{ xs: 'column', md: 'row' }}
        >
          {tools.map(({ key, title, description, icon, route }) => (
            <Card
              key={key}
              elevation={2}
              sx={{
                background: cardBg,
                border: cardBorder,
                borderRadius: "20px",
                minWidth: 280,
                maxWidth: 340,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "space-between",
                transition: "box-shadow 0.2s",
                cursor: "pointer",
                "&:hover": {
                  boxShadow: '0 4px 24px 0 rgba(70,95,255,0.11), 0 1.5px 7px 0 rgba(70,95,255,0.18)'
                }
              }}
              onClick={() => navigate(route)}
            >
              <CardContent
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <Box
                  sx={{
                    mb: 2,
                    bgcolor: "#465fff",
                    color: "#fff",
                    p: 1.5,
                    display: "inline-flex",
                    borderRadius: "10px",
                  }}
                >
                  {icon}
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ color: cardText }}>
                  {title}
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? "#BBB" : "#666" }}>
                  {description}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{
                    mt: 4,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    navigate(route);
                  }}
                >
                  Open {title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      </div>
    </div>
  );
};

export default ToolsPage;
