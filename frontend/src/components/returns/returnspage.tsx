import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../features/backend/api";

// import { AuthContext } from "../../context/AuthContext"; // <-- Not used, so remove
import {
  Box,
  Typography,
  Paper,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  AssignmentReturn as ReturnIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import InlineLoader from "../common/InlineLoader";

// Custom hook to detect Tailwind dark mode
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

type WeeklyStat = {
  date: string;
  count: number;
};

type SalesChannelRow = {
  sales_channel: string;
  count: number;
};

type DashboardData = {
  totalReturns: number;
  salesChannelWise: SalesChannelRow[];
  weeklyStats: WeeklyStat[];
};

const ReturnsPage = () => {
  const navigate = useNavigate();
  // const { user } = useContext(AuthContext); // <-- Not needed, remove

  // Use Tailwind dark mode detection
  const isDark = useTailwindDarkMode();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalReturns: 0,
    salesChannelWise: [],
    weeklyStats: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest<{ status: string; data: DashboardData }>(
        "/returns/dashboard"
      );
      if (response.status === "success") {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error("Error fetching return dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  // Theme-based dynamic colors
  const cardBg = isDark ? "#0f172a" : "#fff";
  const graphBg = isDark ? "#0f172a" : "#fff";
  const graphText = isDark ? "#fff" : "#222";
  const chartGrid = isDark ? "#232d46" : "#eee";
  const chartAxis = isDark ? "#ccc" : "#222";
  const chartTooltipBg = isDark
    ? "rgba(23,31,47,0.95)"
    : "rgba(255,255,255,0.95)";
  const chartTooltipColor = isDark ? "#fff" : "#222";
  const chartLine = "#465efe";
  const chartGradientId = "rtoReturnsGradient";

  return (
    <div
      style={{
        minHeight: "auto",
        background: "transparent",
        padding: "0",
        transition: "background 0.3s",
      }}
    >
      <Box sx={{ width: "100%" }}>
        {isLoading && (
          <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
            <InlineLoader message="Loading return metrics..." />
          </Box>
        )}
        {/* Header Section */}
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          justifyContent={{ md: "space-between" }}
          mb={8}
          gap={6}
        >
          <Box>
            <Typography
              component="h1"
              className="app-page-title"
              sx={{
                color: isDark ? "#fff" : "#222",
                fontWeight: 800,
                fontSize: "30px",
                lineHeight: "38px",
              }}
            >
              Returns Management
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px",
                fontWeight: 500,
                color: "#fff",
                borderRadius: "12px",
                background: "#465fff",
                fontSize: "14px",
                marginRight: 12,
                border: 0,
                cursor: "pointer",
              }}
              onClick={() => navigate("/returns/new-return")}
            >
              <ReturnIcon style={{ marginRight: 8 }} />
              Add New Return
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px",
                fontWeight: 500,
                color: "#fff",
                borderRadius: "12px",
                background: "#465fff",
                fontSize: "14px",
                border: 0,
                cursor: "pointer",
              }}
              onClick={() => navigate("/returns/logs")}
            >
              <HistoryIcon style={{ marginRight: 8 }} />
              View Returns Logs
            </button>
          </Box>
        </Box>

        {/* Stats and Graph Section */}
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          gap={4}
          mb={8}
        >
          {/* Total Returns Card */}
          <Box
            component={Paper}
            elevation={2}
            sx={{
              borderRadius: "20px",
              bgcolor: cardBg,
              border: isDark ? "1px solid #232d46" : "1px solid #f3f3f3",
              minWidth: 320,
              maxWidth: 400,
              width: 400,
              height: 320,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <CardContent
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    borderRadius: "50%",
                    p: 2,
                    bgcolor: "#465fff",
                    color: "#fff",
                    display: "flex",
                  }}
                >
                  <AssignmentIcon />
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ color: isDark ? "#fff" : "#222" }}
                  >
                    Total RTO Orders
                  </Typography>
                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    sx={{ color: isDark ? "#fff" : "#222" }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      dashboardData.totalReturns
                    )}
                  </Typography>
                </Box>
              </Box>
              <Box mt={3}>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  sx={{ color: isDark ? "#fff" : "#222", mb: 1 }}
                >
                  Sales Channel Breakdown
                </Typography>
                <TableContainer>
                  <Table size="small" sx={{ bgcolor: "transparent" }}>
                    <TableBody>
                      {dashboardData.salesChannelWise.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2}>
                            {isLoading ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <span style={{ color: "#888" }}>
                                No sales channel data
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      {dashboardData.salesChannelWise.map((row) => (
                        <TableRow key={row.sales_channel}>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              color: isDark ? "#fff" : "#222",
                              border: 0,
                            }}
                          >
                            {row.sales_channel}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: "bold",
                              color: isDark ? "#fff" : "#222",
                              border: 0,
                            }}
                          >
                            {row.count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </CardContent>
          </Box>

          {/* Modern Area Graph */}
          <Box
            component={Paper}
            elevation={2}
            sx={{
              borderRadius: "20px",
              bgcolor: graphBg,
              color: graphText,
              border: isDark ? "1px solid #232d46" : "1px solid #f3f3f3",
              minHeight: 320,
              height: 320,
              flex: 1,
              p: 2,
              display: "flex",
              flexDirection: "column",
              transition: "background 0.3s",
            }}
          >
            <Box
              mb={1}
              display="flex"
              alignItems="center"
              gap={1}
              fontWeight={600}
              style={{ color: graphText }}
            >
              <TrendingUpIcon />
              Weekly Return Trends
            </Box>
            <Box flex="1 1 0" minHeight={220}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.weeklyStats}>
                  <defs>
                    <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartLine} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={chartLine} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    padding={{ left: 20, right: 20 }}
                    stroke={chartAxis}
                  />
                  <YAxis stroke={chartAxis} />
                  <ChartTooltip
                    labelFormatter={formatDate}
                    formatter={(value) => [`${value} returns`, "Count"]}
                    contentStyle={{
                      backgroundColor: chartTooltipBg,
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      color: chartTooltipColor,
                    }}
                    labelStyle={{ color: chartTooltipColor }}
                    itemStyle={{ color: chartTooltipColor }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={chartLine}
                    fill={`url(#${chartGradientId})`}
                    fillOpacity={1}
                    strokeWidth={3}
                    isAnimationActive
                    animationBegin={140}
                    animationDuration={4800}
                    animationEasing="ease-in-out"
                    dot={false}
                    activeDot={{ r: 4, fill: "#2432b7", stroke: "#ffffff", strokeWidth: 1 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
        {/* Buttons remain as is (already in header section) */}
      </Box>
    </div>
  );
};

export default ReturnsPage;