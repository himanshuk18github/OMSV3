import { useEffect, useMemo, useState } from "react";
import InventoryDonut from "../../components/dashboard/InventoryDonut";
import OrdersPerDayChart from "../../components/dashboard/OrdersPerDayChart";
import OrdersStatGrid from "../../components/dashboard/OrdersStatGrid";
import RecentOrdersTable from "../../components/dashboard/RecentOrdersTable";
import ReturnCancelStats from "../../components/dashboard/ReturnCancelStats";
import SalesBarChart from "../../components/dashboard/SalesBarChart";
import SettlementCard from "../../components/dashboard/SettlementCard";
import TopSellingProducts from "../../components/dashboard/TopSellingProducts";
import PageMeta from "../../components/common/PageMeta";
import InlineLoader from "../../components/common/InlineLoader";
import { usePageLoadingState } from "../../context/PageLoadingContext";
import { apiRequest } from "../../features/backend/api";

type DashboardMetrics = {
  hero: {
    revenue_this_month: number;
    active_pipeline: number;
    returns: number;
  };
  status_cards: { key: string; label: string; count: number; color?: string }[];
  sales_analytics: { month: string; orders: number }[];
  orders_per_day: { date: string; orders: number }[];
  settlements_total: number;
  salesChannelBreakdown: { label: string; value: number; color?: string }[];
  inventory: { out_of_stock: number; low_stock: number; available: number; total_products: number };
  returns_cancellations: { Delivered?: number; Cancelled?: number; RTO?: number };
  top_selling_products: { sku_fixed: string; product_name: string; count: number }[];
  recent_orders: {
    ref_no: string;
    customer_name: string;
    sales_channel: string;
    sku_count: number;
    status: string;
  }[];
};

const moneyFormat = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function Home() {
  const onLoadingComplete = usePageLoadingState();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    apiRequest<{ data?: DashboardMetrics }>("/orders/dashboard-overview")
      .then((response) => {
        setMetrics(response.data ?? null);
      })
      .catch((fetchError) => {
        setError(fetchError.message || "Error fetching metrics");
      })
      .finally(() => {
        setLoading(false);
        onLoadingComplete();
      });
  }, []);

  const heroStats = useMemo(() => [
    {
      label: "Revenue This Month",
      value: `₹ ${moneyFormat.format(metrics?.hero?.revenue_this_month ?? 0)}`,
      note: "Month-to-date collections",
      alignRight: false,
    },
    {
      label: "Active Pipeline",
      value: Number(metrics?.hero?.active_pipeline ?? 0).toLocaleString("en-IN"),
      note: "Orders still moving",
      alignRight: true,
    },
    {
      label: "Returns",
      value: Number(metrics?.hero?.returns ?? 0).toLocaleString("en-IN"),
      note: "Cancelled and RTO",
      alignRight: false,
    },
  ], [metrics?.hero?.active_pipeline, metrics?.hero?.revenue_this_month, metrics?.hero?.returns]);

  const orderedStatusCards = useMemo(() => {
    const cards = metrics?.status_cards ?? [];
    const byKey = Object.fromEntries(cards.map((card) => [card.key, card]));
    const pendingConfirmed = Number(byKey.pending?.count ?? 0) + Number(byKey.confirmed?.count ?? 0);

    return [
      {
        key: "total_orders",
        label: "Total Orders",
        count: Number(byKey.total_orders?.count ?? 0),
        color: byKey.total_orders?.color,
      },
      {
        key: "pending_confirmed",
        label: "Pending / Confirmed",
        count: pendingConfirmed,
        color: "#2563eb",
      },
      {
        key: "packed",
        label: "Packed",
        count: Number(byKey.packed?.count ?? 0),
        color: byKey.packed?.color || "#06b6d4",
      },
      {
        key: "dispatched",
        label: "Dispatched",
        count: Number(byKey.dispatched?.count ?? 0),
        color: byKey.dispatched?.color,
      },
      {
        key: "in_transit",
        label: "In Transit",
        count: Number(byKey.in_transit?.count ?? 0),
        color: byKey.in_transit?.color,
      },
      {
        key: "delivered",
        label: "Delivered",
        count: Number(byKey.delivered?.count ?? 0),
        color: byKey.delivered?.color,
      },
      {
        key: "cancelled",
        label: "Cancelled",
        count: Number(byKey.cancelled?.count ?? 0),
        color: byKey.cancelled?.color,
      },
      {
        key: "rto_delivered",
        label: "RTO Delivered",
        count: Number(byKey.rto_delivered?.count ?? 0),
        color: byKey.rto_delivered?.color,
      },
    ];
  }, [metrics?.status_cards]);

  return (
    <>
      <PageMeta
        title="Dashboard | OMS"
        description="Unified operations dashboard for orders, inventory, settlements, and returns."
      />
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_52%,#38bdf8_100%)] px-6 py-8 text-white shadow-sm md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 app-label text-white/80">
                Apni Stationery OMS
              </div>
              <h1 className="text-[30px] font-bold leading-[38px] tracking-[-0.02em] text-white md:text-[40px] md:leading-[48px]">
                Command Dashboard
              </h1>
              <p className="text-[16px] font-normal leading-6 text-white/80 md:max-w-2xl">
                Live operational view across orders, fulfillment, revenue, and risk signals.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-[640px] lg:min-w-[520px] lg:ml-auto xl:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur ${stat.alignRight ? "text-right" : ""}`}
                >
                  <div className="app-label text-white/75">{stat.label}</div>
                  <div className="mt-1 text-[22px] font-semibold leading-[30px] text-white">{stat.value}</div>
                  <div className="mt-1 text-xs text-white/70">{stat.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-10">
            <div className="flex min-h-[120px] items-center justify-center app-body-large text-text-muted">
              <InlineLoader message="Loading dashboard..." />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-error/20 bg-error/5 px-6 py-8">
            <h2 className="app-h3 text-error">Dashboard unavailable</h2>
            <p className="mt-1 app-body-normal text-text-secondary">The dashboard could not load right now.</p>
            <div className="mt-4 app-body-large text-error">{error}</div>
          </div>
        ) : metrics ? (
          <>
            <OrdersStatGrid data={orderedStatusCards} />

            <div className="grid gap-6 xl:grid-cols-7 items-stretch">
              <div className="xl:col-span-4 h-full">
                <SalesBarChart data={metrics.sales_analytics} className="h-full min-h-[390px]" />
              </div>

              <div className="xl:col-span-3 h-full">
                <SettlementCard
                  title="Sales / Revenue Till Date"
                  description="Delivered orders only"
                  totalLabel="Delivered Revenue"
                  totalValue={metrics.settlements_total}
                  breakdownLabel="By Sales Channel"
                  breakdownItems={metrics.salesChannelBreakdown}
                  className="h-full min-h-[390px]"
                />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2 items-stretch">
              <div className="h-full">
                <InventoryDonut data={metrics.inventory} className="h-full min-h-[390px]" />
              </div>

              <div className="h-full">
                <ReturnCancelStats data={metrics.returns_cancellations} className="h-full min-h-[390px]" />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2 items-stretch">
              <div className="h-full">
                <OrdersPerDayChart data={metrics.orders_per_day} className="h-full min-h-[390px]" />
              </div>

              <div className="h-full">
                <TopSellingProducts data={metrics.top_selling_products} className="h-full min-h-[390px]" />
              </div>
            </div>

            <div>
              <RecentOrdersTable data={metrics.recent_orders} />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}