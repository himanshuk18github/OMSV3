import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material";

const muiTheme = createTheme({
  palette: {
    primary: {
      main: "#2563eb",
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h1: {
      fontSize: "28px",
      lineHeight: "36px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h2: {
      fontSize: "22px",
      lineHeight: "30px",
      fontWeight: 600,
    },
    h3: {
      fontSize: "18px",
      lineHeight: "26px",
      fontWeight: 600,
    },
    h4: {
      fontSize: "18px",
      lineHeight: "26px",
      fontWeight: 600,
    },
    h5: {
      fontSize: "16px",
      lineHeight: "24px",
      fontWeight: 600,
    },
    h6: {
      fontSize: "14px",
      lineHeight: "20px",
      fontWeight: 600,
    },
    body1: {
      fontSize: "14px",
      lineHeight: "20px",
    },
    body2: {
      fontSize: "12px",
      lineHeight: "18px",
    },
    button: {
      fontSize: "14px",
      fontWeight: 600,
      letterSpacing: "0.02em",
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#ffffff",
          color: "#0f172a",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
        },
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <AppWrapper>
          <App />
        </AppWrapper>
      </MuiThemeProvider>
    </ThemeProvider>
  </StrictMode>,
);
