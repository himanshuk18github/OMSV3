import { useEffect, useState } from "react";
import { apiRequest } from "../../features/backend/api";

import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { useNavigate } from "react-router-dom";
import AssignmentIcon from "@mui/icons-material/Assignment";
import UpdateIcon from "@mui/icons-material/Update";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip as ChartTooltip,
} from "recharts";
import InlineLoader from "../common/InlineLoader";
import { usePageLoadingState } from "../../context/PageLoadingContext";

// --- Tailwind/Dark mode hook ---
function useTailwindDarkMode() {
  const [isDark, setIsDark] = useState(
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
}

const BUTTON_COLOR = "#465fff";
const CHART_LINE_COLOR = "#4860fd";
const CHART_GRADIENT_ID = "ordersGradient";

type StatusCard = {
  key: string;
  label: string;
  count: number;
  color?: string;
};

type BifurcationItem = {
  status: string;
  label: string;
  count: number;
  color: string;
};

type ChartDataItem = {
  date: string;
  count: number;
};

const SalesOrdersPage = () => {
  const navigate = useNavigate();
  const isDark = useTailwindDarkMode();
  const onLoadingComplete = usePageLoadingState();

  // Card Data: always for ALL ORDERS (not filtered!)
  const [loadingCard, setLoadingCard] = useState(true);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [bifurcation, setBifurcation] = useState<BifurcationItem[]>([]);
  const [pendingUpdateCount, setPendingUpdateCount] = useState<number>(0);

  // Graph Data: filtered!
  const [loadingGraph, setLoadingGraph] = useState(true);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [filterType, setFilterType] = useState<"7days" | "period">("7days");
  const [periodYear, setPeriodYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [periodMonth, setPeriodMonth] = useState<string>("all");
  const [yearList, setYearList] = useState<string[]>([]);

  // Colors for dark/light mode
  const cardBg = isDark ? "#0f172a" : "#fff";
  const cardText = isDark ? "#fff" : "#353535";
  const mutedText = isDark ? "#bfc7d1" : "#666";
  const dividerColor = isDark ? "#232d46" : "#e0e0e0";

  // --- Fetch years for period filter ---
  useEffect(() => {
    const now = new Date();
    const years: string[] = [];
    for (let y = 2022; y <= now.getFullYear() + 1; y++) years.push(y.toString());
    setYearList(years);
  }, []);

  // --- Fetch card (total+breakdown) data (ALWAYS all orders) ---
  useEffect(() => {
    setLoadingCard(true);
    apiRequest<{ status: string; data: { status_cards?: StatusCard[] } }>(
      "/orders/dashboard-overview"
    )
      .then((res) => {
        const cards = res.data.status_cards || [];
        
        // Extract total orders
        const total = cards.find((c) => c.key === "total_orders")?.count || 0;
        setTotalOrders(total);
        
        // Calculate pending update count (pending + confirmed + packed + dispatched)
        const pending = cards.find((c) => c.key === "pending")?.count || 0;
        const confirmed = cards.find((c) => c.key === "confirmed")?.count || 0;
        const packed = cards.find((c) => c.key === "packed")?.count || 0;
        const dispatched = cards.find((c) => c.key === "dispatched")?.count || 0;
        setPendingUpdateCount(pending + confirmed + packed + dispatched);
        
        // Map to bifurcation format
        const bifurcationMap: { [key: string]: BifurcationItem } = {
          delivered: { status: "delivered", label: "Delivered", count: 0, color: "#16a34a" },
          in_transit: { status: "in_transit", label: "In Transit", count: 0, color: "#2563eb" },
          cancelled: { status: "cancelled", label: "Cancelled", count: 0, color: "#dc2626" },
          confirmed: { status: "confirmed", label: "Confirmed", count: 0, color: "#f59e0b" },
          rto_delivered: { status: "rto_delivered", label: "RTO Orders", count: 0, color: "#a855f7" },
          pending: { status: "pending", label: "Pending", count: 0, color: "#9ca3af" },
        };
        
        // Populate bifurcation counts from status cards
        cards.forEach((card) => {
          if (card.key === "delivered" && bifurcationMap.delivered) bifurcationMap.delivered.count = card.count;
          if (card.key === "in_transit" && bifurcationMap.in_transit) bifurcationMap.in_transit.count = card.count;
          if (card.key === "cancelled" && bifurcationMap.cancelled) bifurcationMap.cancelled.count = card.count;
          if (card.key === "confirmed" && bifurcationMap.confirmed) bifurcationMap.confirmed.count = card.count;
          if (card.key === "rto_delivered" && bifurcationMap.rto_delivered) bifurcationMap.rto_delivered.count = card.count;
          if (card.key === "pending" && bifurcationMap.pending) bifurcationMap.pending.count = card.count;
        });
        
        setBifurcation(Object.values(bifurcationMap));
      })
      .finally(() => setLoadingCard(false));
  }, []);

  // --- Fetch data for graph (filtered) ---
  useEffect(() => {
    setLoadingGraph(true);
    let url = `/orders/dashboard-overview?`;
    if (filterType === "7days") {
      url += `range=7days`;
    } else if (filterType === "period") {
      url += `range=period&year=${periodYear}`;
      if (periodMonth !== "all") url += `&month=${periodMonth}`;
    }
    apiRequest<{ status: string; data: { chartData: ChartDataItem[] } }>(url)
      .then((res) => {
        setChartData(res.data.chartData || []);
      })
      .finally(() => {
        setLoadingGraph(false);
        onLoadingComplete();
      });
    // eslint-disable-next-line
  }, [filterType, periodYear, periodMonth, onLoadingComplete]);

  // --- Month List for select ---
  const monthOptions = [
    { label: "All Months", value: "all" },
    { label: "Jan", value: "01" },
    { label: "Feb", value: "02" },
    { label: "Mar", value: "03" },
    { label: "Apr", value: "04" },
    { label: "May", value: "05" },
    { label: "Jun", value: "06" },
    { label: "Jul", value: "07" },
    { label: "Aug", value: "08" },
    { label: "Sep", value: "09" },
    { label: "Oct", value: "10" },
    { label: "Nov", value: "11" },
    { label: "Dec", value: "12" },
  ];

  // --- Card and chart styles ---
  const cardStyles = {
    borderRadius: "12px",
    boxShadow: isDark
      ? "0 4px 10px rgba(30,40,80,0.18)"
      : "0 4px 6px rgba(0,0,0,0.06)",
    border: isDark ? "1px solid #232d46" : "none",
    background: cardBg,
    color: cardText,
    transition: "background 0.2s",
  };

  function formatXAxis(date: string) {
    if (filterType === "7days" || (filterType === "period" && periodMonth !== "all")) {
      const dt = new Date(date);
      return dt.getDate().toString();
    }
    if (filterType === "period" && periodMonth === "all") {
      const dt = new Date(date);
      return dt.toLocaleString("en-US", { month: "short" });
    }
    return date;
  }

  return (
    <Box
      sx={{
        p: { xs: 0, md: 1 },
        minHeight: "auto",
        bgcolor: "transparent",
        transition: "background 0.2s",
      }}
    >
      {(loadingCard || loadingGraph) && (
        <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
          <InlineLoader message="Loading sales order metrics..." />
        </Box>
      )}
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          component="h1"
          className="app-page-title"
          sx={{ color: cardText, fontWeight: 800, fontSize: "30px", lineHeight: "38px" }}
        >
          Sales Order Management
        </Typography>
      </Box>

      {/* Action Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }} alignItems="stretch">
        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              width: "100%",
              minHeight: "200px",
              p: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: "pointer",
              ...cardStyles,
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: isDark
                  ? "0 6px 18px rgba(70,95,255,0.25)"
                  : "0 6px 12px rgba(0,0,0,0.08)",
                background: isDark ? "#232d46" : "#f5f7fb",
              },
            }}
            onClick={() => navigate("/sales-orders/confirmation")}
          >
            <AssignmentIcon sx={{ fontSize: 40, color: BUTTON_COLOR }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                textAlign: "center",
                color: cardText,
                fontSize: "15px",
              }}
            >
              Order Confirmation
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: pendingUpdateCount > 0 ? "#dc2626" : "#16a34a",
                fontSize: "13px",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {loadingCard
                ? "Checking Pending Updates..."
                : pendingUpdateCount > 0
                  ? `${pendingUpdateCount} Pending Orders to Update`
                  : "No Pending Orders to Update"}
            </Typography>
            <Box
              component="button"
              sx={{
                mt: 2,
                bgcolor: BUTTON_COLOR,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                px: 3,
                py: 0.7,
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: 0.3,
                cursor: "pointer",
                width: "100%",
                transition: "background 0.2s",
                "&:hover": {
                  bgcolor: "#2840c0",
                },
              }}
              onClick={() => navigate("/sales-orders/confirmation")}
            >
              Go
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              width: "100%",
              minHeight: "200px",
              p: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: "pointer",
              ...cardStyles,
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: isDark
                  ? "0 6px 18px rgba(70,95,255,0.25)"
                  : "0 6px 12px rgba(0,0,0,0.08)",
                background: isDark ? "#232d46" : "#f5f7fb",
              },
            }}
            onClick={() => navigate("/sales-orders/update")}
          >
            <UpdateIcon sx={{ fontSize: 40, color: BUTTON_COLOR }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                textAlign: "center",
                color: cardText,
                fontSize: "15px",
              }}
            >
              Update Order Details
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: mutedText,
                fontSize: "13px",
              }}
            >
              View & Update Orders
            </Typography>
            <Box
              component="button"
              sx={{
                mt: 2,
                bgcolor: BUTTON_COLOR,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                px: 3,
                py: 0.7,
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: 0.3,
                cursor: "pointer",
                width: "100%",
                transition: "background 0.2s",
                "&:hover": {
                  bgcolor: "#2840c0",
                },
              }}
              onClick={() => navigate("/sales-orders/update")}
            >
              Go
            </Box>
          </Card>
        </Grid>

        {/* Total Orders & Bifurcation Card */}
        <Grid item xs={12} lg={6}>
          <Card
            sx={{
              minHeight: "200px",
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              ...cardStyles,
            }}
          >
            {/* Total Orders */}
            <Box
              sx={{
                flex: "1 1 50%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                px: 1,
                py: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  textAlign: "center",
                  fontSize: "15px",
                  mb: 1,
                  color: cardText,
                }}
              >
                Total No. of Orders Received
              </Typography>
              {loadingCard ? (
                <CircularProgress size={28} />
              ) : (
                <Typography
                  variant="h4"
                  sx={{
                    color: isDark ? BUTTON_COLOR : "#353535",
                    fontWeight: 700,
                    textAlign: "center",
                    mb: 0,
                  }}
                >
                  {totalOrders}
                </Typography>
              )}
            </Box>
            {/* Divider */}
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: dividerColor,
                mx: 0.5,
                my: 2,
                borderRightWidth: 2,
              }}
            />
            {/* Bifurcation */}
            <Box
              sx={{
                flex: "1 1 50%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                pl: 2,
                pr: 1,
              }}
            >
              {bifurcation.map((bf) => (
                <Box
                  key={bf.status}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontWeight: "bold",
                    mb: 0.5,
                    color: bf.color,
                  }}
                >
                  <span>{bf.label}</span>
                  <span>{bf.count}</span>
                </Box>
              ))}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Orders Graph */}
      <Card
        sx={{
          borderRadius: "12px",
          p: "24px",
          boxShadow: isDark
            ? "0 4px 10px rgba(30,40,80,0.18)"
            : "0 4px 6px rgba(0,0,0,0.06)",
          marginTop: "24px",
          minHeight: "320px",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          border: isDark ? "1px solid #232d46" : "none",
          background: cardBg,
          color: cardText,
        }}
      >
        {/* Filter Row */}
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          mb={2}
          flexWrap="wrap"
          sx={{ justifyContent: "flex-end" }}
        >
          <FormControl size="small" sx={{ minWidth: 130, mr: 2 }}>
            <InputLabel sx={{ color: isDark ? "#fff" : "#222" }}>
              Show
            </InputLabel>
            <Select
              label="Show"
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as "7days" | "period")
              }
              sx={{
                color: isDark ? "#fff" : "#222",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: isDark ? "#232d46" : "#ccc",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: BUTTON_COLOR,
                },
                bgcolor: isDark ? "#232d46" : "#fff",
              }}
            >
              <MenuItem value="7days">Last 7 Days</MenuItem>
              <MenuItem value="period">Period</MenuItem>
            </Select>
          </FormControl>
          {filterType === "period" && (
            <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
              <InputLabel sx={{ color: isDark ? "#fff" : "#222" }}>
                Year
              </InputLabel>
              <Select
                label="Year"
                value={periodYear}
                onChange={(e) => {
                  setPeriodYear(e.target.value as string);
                  setPeriodMonth("all");
                }}
                sx={{
                  color: isDark ? "#fff" : "#222",
                  bgcolor: isDark ? "#232d46" : "#fff",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: isDark ? "#232d46" : "#ccc",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: BUTTON_COLOR,
                  },
                }}
              >
                {yearList.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {filterType === "period" && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ color: isDark ? "#fff" : "#222" }}>
                Month
              </InputLabel>
              <Select
                label="Month"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value as string)}
                sx={{
                  color: isDark ? "#fff" : "#222",
                  bgcolor: isDark ? "#232d46" : "#fff",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: isDark ? "#232d46" : "#ccc",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: BUTTON_COLOR,
                  },
                }}
              >
                {monthOptions.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.value === "all"
                      ? `All Months`
                      : `${m.label}-${periodYear}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        <Box flex={1} width="100%" minHeight={220}>
          {loadingGraph ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 180,
              }}
            >
              <CircularProgress size={28} />
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id={CHART_GRADIENT_ID}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={CHART_LINE_COLOR}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_LINE_COLOR}
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "#232d46" : "#eee"}
                />
                <XAxis dataKey="date" tickFormatter={formatXAxis} />
                <YAxis allowDecimals={false} />
                <ChartTooltip
                  labelFormatter={(d) => {
                    const dt = new Date(d);
                    if (
                      filterType === "period" &&
                      periodMonth === "all"
                    ) {
                      return dt.toLocaleString("en-GB", {
                        month: "short",
                        year: "numeric",
                      });
                    }
                    return dt.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    });
                  }}
                  formatter={(value) => [`${value} Orders`, "Orders"]}
                  contentStyle={{
                    backgroundColor: isDark
                      ? "rgba(23,31,47,0.95)"
                      : "rgba(255,255,255,0.95)",
                    border: "none",
                    borderRadius: "8px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    color: isDark ? "#fff" : "#222",
                  }}
                  labelStyle={{ color: isDark ? "#fff" : "#222" }}
                  itemStyle={{ color: isDark ? "#fff" : "#222" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_LINE_COLOR}
                  fill={`url(#${CHART_GRADIENT_ID})`}
                  fillOpacity={1}
                  strokeWidth={3}
                  isAnimationActive
                  animationBegin={140}
                  animationDuration={4800}
                  animationEasing="ease-in-out"
                  dot={false}
                  activeDot={{ r: 4, fill: "#2340a0", stroke: "#ffffff", strokeWidth: 1 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Box>
        <Box height={40}></Box>
      </Card>
    </Box>
  );
};

export default SalesOrdersPage;