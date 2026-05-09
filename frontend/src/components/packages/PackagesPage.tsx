import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../apicallconfig";
import {
  Box,
  Typography,
  Paper,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import {
  LocalShipping as ShippingIcon,
  History as HistoryIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
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
import { usePageLoading } from "../../context/PageLoadingContext";

type WeeklyStat = {
  date: string;
  count: number;
};

type RecentActivity = {
  id: number;
  ref_no: string;
  customer_name: string;
  sales_channel: string;
  item_count: number;
  status: string;
  order_date: string | null;
  created_at: string;
};

type DashboardData = {
  pendingCount: number;
  lastRefNo: string;
  weeklyStats: WeeklyStat[];
  recentActivities: RecentActivity[];
};

type ApiEnvelope<T> = {
  status: string;
  data: T;
};

function getAuthToken(): string | null {
  return sessionStorage.getItem("oms_auth_token") || localStorage.getItem("oms_auth_token");
}

async function fetchWithAuth<T>(url: string): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Unable to fetch package dashboard data.");
  }

  return payload as T;
}

const useTailwindDarkMode = () => {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false,
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

const initialDashboardData: DashboardData = {
  pendingCount: 0,
  lastRefNo: "",
  weeklyStats: [],
  recentActivities: [],
};

const PackagesPage = () => {
  const navigate = useNavigate();
  const isDark = useTailwindDarkMode();
  const { setPageLoading } = usePageLoading();

  const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [chartRenderKey, setChartRenderKey] = useState(0);

  const cardBg = isDark ? "#0f172a" : "#ffffff";
  const graphBg = isDark ? "#0f172a" : "#ffffff";
  const graphText = isDark ? "#e5e7eb" : "#1f2937";
  const tableBg = isDark ? "#0f172a" : "#ffffff";
  const tableText = isDark ? "#e5e7eb" : "#1f2937";
  const chartGrid = isDark ? "#253149" : "#e5e7eb";
  const chartAxis = isDark ? "#cbd5e1" : "#374151";
  const chartTooltipBg = isDark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.96)";
  const chartTooltipColor = isDark ? "#e5e7eb" : "#1f2937";
  const chartLine = "#465fff";

  const chartData = useMemo(() => {
    if (dashboardData.weeklyStats.length > 0) {
      return dashboardData.weeklyStats;
    }

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        date: date.toISOString().slice(0, 10),
        count: 0,
      };
    });
  }, [dashboardData.weeklyStats]);

  useEffect(() => {
    void fetchDashboardData(true, true);

    const interval = window.setInterval(() => {
      void fetchDashboardData(false, false);
    }, 300000);

    return () => {
      window.clearInterval(interval);
      setPageLoading(false);
    };
  }, []);

  const fetchDashboardData = async (showLoader = true, useGlobalPreloader = false) => {
    if (useGlobalPreloader) {
      setPageLoading(true);
    }

    if (showLoader) {
      setIsLoading(true);
    }

    try {
      setErrorMessage("");
      const payload = await fetchWithAuth<ApiEnvelope<DashboardData>>(`${API_BASE_URL}/dispatches/dashboard`);
      setDashboardData(payload.data || initialDashboardData);
    } catch (error: any) {
      setErrorMessage(error?.message || "Unable to fetch package dashboard data.");
    } finally {
      setIsLoading(false);

      if (useGlobalPreloader) {
        // Ensure React paints updated content before hiding route preloader.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setChartRenderKey((prev) => prev + 1);
            setPageLoading(false);
          });
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) {
      return "-";
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <Box sx={{ width: "100%" }}>
      {isLoading && (
        <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
          <InlineLoader message="Loading package metrics..." />
        </Box>
      )}

      {errorMessage && !isLoading && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: "#ef4444", fontWeight: 600 }}>{errorMessage}</Typography>
        </Box>
      )}

      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        alignItems={{ md: "center" }}
        justifyContent={{ md: "space-between" }}
        mb={4}
        gap={4}
      >
        <Box>
          <Typography
            component="h1"
            className="app-page-title"
            sx={{
              color: isDark ? "#ffffff" : "#222222",
              fontWeight: 800,
              fontSize: "30px",
              lineHeight: "38px",
            }}
          >
            Dispatch Management
          </Typography>
        </Box>

        <Box display="flex" gap={2} flexWrap="wrap">
          <button
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px",
              fontWeight: 600,
              color: "#ffffff",
              borderRadius: "12px",
              background: "#465fff",
              fontSize: "14px",
              border: 0,
              cursor: "pointer",
            }}
            onClick={() => navigate("/packages/new-dispatch")}
          >
            <ShippingIcon style={{ marginRight: 8 }} />
            Dispatch New Order
          </button>

          <button
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px",
              fontWeight: 600,
              color: "#ffffff",
              borderRadius: "12px",
              background: "#465fff",
              fontSize: "14px",
              border: 0,
              cursor: "pointer",
            }}
            onClick={() => navigate("/packages/logs")}
          >
            <HistoryIcon style={{ marginRight: 8 }} />
            View Dispatch Logs
          </button>
        </Box>
      </Box>

      <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={4} mb={5}>
        <Box
          component={Paper}
          elevation={2}
          sx={{
            borderRadius: "20px",
            bgcolor: cardBg,
            border: isDark ? "1px solid #232d46" : "1px solid #edf2f7",
            minWidth: 280,
            maxWidth: 380,
            width: "100%",
            height: 300,
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
                  color: "#ffffff",
                  display: "flex",
                }}
              >
                <AssignmentIcon />
              </Box>
              <Box>
                <Typography className="app-h3" sx={{ color: tableText }}>
                  Pending Orders
                </Typography>
                <Typography variant="h3" fontWeight="bold" sx={{ color: tableText }}>
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : dashboardData.pendingCount}
                </Typography>
              </Box>
            </Box>

            <Typography className="app-text-small" sx={{ color: isDark ? "#cbd5e1" : "#4b5563", mt: 3 }}>
              Latest Reference: {dashboardData.lastRefNo || "N/A"}
            </Typography>
          </CardContent>
        </Box>

        <Box
          component={Paper}
          elevation={2}
          sx={{
            borderRadius: "20px",
            bgcolor: graphBg,
            color: graphText,
            border: isDark ? "1px solid #232d46" : "1px solid #edf2f7",
            minHeight: 300,
            height: 300,
            flex: 1,
            p: 2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box mb={1} display="flex" alignItems="center" gap={1} fontWeight={700}>
            <TrendingUpIcon />
            Weekly Dispatch Trend
          </Box>

          <Box flex="1 1 0" minHeight={220}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                key={`packages-trend-${chartRenderKey}`}
                data={chartData}
                margin={{ top: 10, right: 12, left: 4, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="packagesTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartLine} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={chartLine} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={chartGrid} />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke={chartAxis} />
                <YAxis allowDecimals={false} stroke={chartAxis} />
                <ChartTooltip
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value) => [`${value} dispatched`, "Orders"]}
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
                  fill="url(#packagesTrendGradient)"
                  strokeWidth={2.5}
                  isAnimationActive={!isLoading}
                  animationBegin={140}
                  animationDuration={4800}
                  animationEasing="ease-in-out"
                  dot={false}
                  activeDot={{ r: 4, fill: "#1f3be0", stroke: "#ffffff", strokeWidth: 1 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>

      <Box
        component={Paper}
        elevation={2}
        sx={{
          borderRadius: "20px",
          bgcolor: tableBg,
          color: tableText,
          border: isDark ? "1px solid #232d46" : "1px solid #edf2f7",
          p: 2,
        }}
      >
        <Typography className="app-h3" gutterBottom sx={{ color: tableText, mb: 2 }}>
          Recent Activities (Last 5 Orders)
        </Typography>

        <TableContainer sx={{ overflowX: "auto" }}>
          <Table
            sx={{
              minWidth: 980,
              "& .MuiTableCell-root": {
                color: tableText,
                background: tableBg,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Reference No.</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sales Channel</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Order Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.recentActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{activity.ref_no?.toUpperCase?.() ?? "-"}</TableCell>
                  <TableCell>{activity.customer_name?.toUpperCase?.() ?? "-"}</TableCell>
                  <TableCell>{activity.sales_channel?.toUpperCase?.() ?? "-"}</TableCell>
                  <TableCell align="center">{activity.item_count}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        activity.status.toLowerCase() === "pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : activity.status.toLowerCase() === "dispatched"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {activity.status?.toUpperCase?.() ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell>{formatDateTime(activity.order_date).toUpperCase()}</TableCell>
                  <TableCell>{formatDateTime(activity.created_at).toUpperCase()}</TableCell>
                </TableRow>
              ))}

              {dashboardData.recentActivities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No recent activities found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default PackagesPage;
