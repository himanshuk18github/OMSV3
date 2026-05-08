import { Container, Box, Typography, Button, Stack } from "@mui/material";
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
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

const DocPage = () => {
  const isDark = useTailwindDarkMode();
  const navigate = useNavigate();

  const textColor = isDark ? "#fff" : "#222";

  return (
    <Box
      sx={{
        minHeight: "auto",
        background: "transparent",
        pt: 2,
        transition: "background 0.3s"
      }}
    >
      <Container maxWidth="sm">
        <Typography
          variant="h4"
          className="app-page-title"
          fontWeight={800}
          mb={6}
          sx={{ color: textColor, textAlign: "center" }}
        >
          Document Manager
        </Typography>
        <Stack spacing={4} alignItems="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<UploadFileIcon />}
            sx={{
              minWidth: 260,
              borderRadius: 3,
              fontSize: 18,
              fontWeight: 600,
              py: 2,
              textTransform: "none",
              bgcolor: "#465fff",
              boxShadow: 2,
              '&:hover': { bgcolor: "#2335b6" }
            }}
            onClick={() => navigate("/docs/upload")}
          >
            Upload New Document
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<FolderOpenIcon />}
            sx={{
              minWidth: 260,
              borderRadius: 3,
              fontSize: 18,
              fontWeight: 600,
              py: 2,
              textTransform: "none",
              color: "#465fff",
              borderColor: "#465fff",
              '&:hover': {
                bgcolor: "#f0f3ff",
                borderColor: "#2335b6",
                color: "#2335b6"
              }
            }}
            onClick={() => navigate("/docs/list")}
          >
            View Uploaded Documents
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

export default DocPage;