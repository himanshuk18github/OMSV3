import { useEffect, useRef, useContext, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, matchPath } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { SidebarProvider } from "./context/SidebarContext";
import { PageLoadingProvider, usePageLoading } from "./context/PageLoadingContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Dashboard/Home";
import ItemsPage from "./components/items/ItemsPage";
import PackagesPage from "./components/packages/PackagesPage";
import SalesOrdersPage from "./components/salesorders/SalesOrdersPage";
import OrderConfirmDetails from "./components/salesorders/OrderConfirmDetails";
import Orderconfirmation from "./components/salesorders/OrderConfirmation";
import Updatesalesorder from "./components/salesorders/UpdateSalesOrders";
import UpdateSalesOrdersdetails from "./components/salesorders/UpdateSalesOrdersdetails";
import AddItem from "./components/items/AddItem";
import UpdateInventoryPage from "./components/items/UpdateInventory";
import InventoryLogsPage from "./components/items/InventoryLogsPage";
import NewDispatch from "./components/packages/NewDispatch";
import Dispatchlogs from "./components/packages/DispatchLogs";
import Returns from "./components/returns/returnspage";
import Return_new from "./components/returns/addnewreturn";
import Returnlogs from "./components/returns/returnlogs";
import ViewClosingStock from "./components/items/viewclosingstock";
import TicketPortal from "./components/support/TicketPortal";
import Reports from "./components/reports/reports";
import Importdb from "./components/import/import";
import VendorsPage from "./features/backend/pages/VendorsPage";
import UsersPage from "./features/backend/pages/UsersPage";
import SettlementDashboard from "./components/settlement/SettlementDashboard";
import AddSettlementEntry from "./components/settlement/AddSettlement";
import ViewSettlements from "./components/settlement/ViewSettlements";
import ToolsPage from "./components/tools/toolspage";
import BulkLabelGenerator from "./components/tools/bulklabelgenerator";
import BulkPdfCropper from "./components/tools/bulkpdfcropper";
import InvoicePage from "./components/invoice/invoicepage";
import DocPage from "./components/document/docpage";
import AddNewDoc from "./components/document/addnewdoc";
import ViewDoc from "./components/document/viewdoc";
import FormulaSetupPage from "./components/formula/FormulaSetupPage";
import API_BASE_URL from "./apicallconfig";

function toTitleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPageTitle(pathname: string) {
  const routeTitles: Array<{ pattern: string; title: string }> = [
    { pattern: "/", title: "Dashboard" },
    { pattern: "/signin", title: "Sign In" },
    { pattern: "/profile", title: "Profile" },
    { pattern: "/users", title: "Users" },
    { pattern: "/calendar", title: "Calendar" },
    { pattern: "/items", title: "Products Inventory" },
    { pattern: "/items/add", title: "Add Item" },
    { pattern: "/items/update-inventory", title: "Update Inventory" },
    { pattern: "/items/logs", title: "Inventory Logs" },
    { pattern: "/items/viewclosingstock", title: "Closing Stock" },
    { pattern: "/vendors", title: "Manage Vendors" },
    { pattern: "/packages", title: "Packages" },
    { pattern: "/packages/new-dispatch", title: "New Dispatch" },
    { pattern: "/packages/logs", title: "Dispatch Logs" },
    { pattern: "/sales-orders", title: "Sales Orders" },
    { pattern: "/sales-orders/confirmation", title: "Sales Order Confirmation" },
    { pattern: "/sales-orders/confirm/:refNo", title: "Sales Order Detail" },
    { pattern: "/sales-orders/update", title: "Update Sales Order" },
    { pattern: "/update-sales-orders/:refNo", title: "Update Sales Order Detail" },
    { pattern: "/returns", title: "Returns" },
    { pattern: "/returns/new-return", title: "New Return" },
    { pattern: "/returns/logs", title: "Return Logs" },
    { pattern: "/support", title: "Support" },
    { pattern: "/reports", title: "Reports" },
    { pattern: "/import", title: "Import" },
    { pattern: "/settlement", title: "Settlement" },
    { pattern: "/settlement/add", title: "Add Settlement" },
    { pattern: "/settlement/view", title: "View Settlements" },
    { pattern: "/tools", title: "Tools" },
    { pattern: "/tools/bulk-label-generator", title: "Bulk Label Generator" },
    { pattern: "/tools/bulk-pdf-cropper", title: "Bulk PDF Cropper" },
    { pattern: "/invoicegen", title: "Invoices" },
    { pattern: "/docexplorer", title: "Document Manager" },
    { pattern: "/docs/upload", title: "Upload Document" },
    { pattern: "/docs/list", title: "Documents" },
    { pattern: "/formula-setup", title: "Formula Setup" },
    { pattern: "/blank", title: "Blank Page" },
    { pattern: "/form-elements", title: "Form Elements" },
    { pattern: "/basic-tables", title: "Basic Tables" },
    { pattern: "/alerts", title: "Alerts" },
    { pattern: "/avatars", title: "Avatars" },
    { pattern: "/badge", title: "Badges" },
    { pattern: "/buttons", title: "Buttons" },
    { pattern: "/images", title: "Images" },
    { pattern: "/videos", title: "Videos" },
    { pattern: "/line-chart", title: "Line Chart" },
    { pattern: "/bar-chart", title: "Bar Chart" },
  ];

  const matchedRoute = routeTitles.find((route) =>
    matchPath({ path: route.pattern, end: true }, pathname),
  );

  if (matchedRoute) {
    return matchedRoute.title;
  }

  if (pathname === "*") {
    return "Page Not Found";
  }

  const cleanPath = pathname.replace(/^\/+|\/+$/g, "");
  if (!cleanPath) {
    return "Dashboard";
  }

  const segments = cleanPath.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return toTitleCase(lastSegment);
}

function DocumentTitleManager() {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = getPageTitle(location.pathname);
    document.title = `Apni Stationery ${pageTitle} - OMS`;
  }, [location.pathname]);

  return null;
}

function RoutePreloader() {
  const location = useLocation();
  const { isPageLoading } = usePageLoading();
  const [routeTransitioning, setRouteTransitioning] = useState(false);

  useEffect(() => {
    setRouteTransitioning(true);
  }, [location.pathname]);

  useEffect(() => {
    // Only clear route transitioning if both:
    // 1. Route transition has completed OR a minimum time has passed
    // 2. Page loading is also complete
    if (!routeTransitioning || isPageLoading) {
      return;
    }

    const timer = setTimeout(() => {
      setRouteTransitioning(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [routeTransitioning, isPageLoading]);

  const loading = routeTransitioning || isPageLoading;

  if (!loading) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#f9fafb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "4px solid #e4e7ec",
          borderTopColor: "#465fff",
          animation: "route-loader-spin 1s linear infinite",
        }}
      />

      <style>{`
        @keyframes route-loader-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function AppInner() {
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const auth = useContext(AuthContext) as any;

  useEffect(() => {
    if (!auth || !auth.user) return;

    function handleLogout() {
      if (auth.logout) auth.logout();
      window.location.href = "/signin";
    }

    function resetInactivityTimer() {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(handleLogout, 60 * 60 * 1000);
    }

    async function verifyActiveSession() {
      const token = sessionStorage.getItem("oms_auth_token");
      if (!token) {
        handleLogout();
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          handleLogout();
        }
      } catch {
        // Keep session during transient network failures.
      }
    }

    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    resetInactivityTimer();
    verifyActiveSession();
    sessionCheckRef.current = setInterval(verifyActiveSession, 30 * 1000);

    return () => {
      window.removeEventListener("mousemove", resetInactivityTimer);
      window.removeEventListener("keydown", resetInactivityTimer);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
    };
  }, [auth && auth.user]);

  return (
    <>
      <BrowserRouter>
        <SidebarProvider>
          <PageLoadingProvider>
            <DocumentTitleManager />
            <ScrollToTop />
            <RoutePreloader />
            <div className="app-contents-wrap">
            <Routes>
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index path="/" element={<Home />} />
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/blank" element={<Blank />} />
              <Route path="/form-elements" element={<FormElements />} />
              <Route path="/basic-tables" element={<BasicTables />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/items/add" element={<AddItem />} />
              <Route path="/items/update-inventory" element={<UpdateInventoryPage />} />
              <Route path="/items/logs" element={<InventoryLogsPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/packages" element={<PackagesPage />} />
              <Route path="/packages/new-dispatch" element={<NewDispatch />} />
              <Route path="/packages/logs" element={<Dispatchlogs />} />
              <Route path="/sales-orders" element={<SalesOrdersPage />} />
              <Route path="/sales-orders/confirmation" element={<Orderconfirmation />} />
              <Route path="/sales-orders/confirm/:refNo" element={<OrderConfirmDetails />} />
              <Route path="/sales-orders/update" element={<Updatesalesorder />} />
              <Route path="/update-sales-orders/:refNo" element={<UpdateSalesOrdersdetails />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/returns/new-return" element={<Return_new />} />
              <Route path="returns/logs" element={<Returnlogs />} />
              <Route path="/items/viewclosingstock" element={<ViewClosingStock />} />
              <Route path="/support" element={<TicketPortal />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/import" element={<Importdb />} />
              <Route path="/settlement" element={<SettlementDashboard />} />
              <Route path="/settlement/add" element={<AddSettlementEntry />} />
              <Route path="/settlement/view" element={<ViewSettlements />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/tools/bulk-label-generator" element={<BulkLabelGenerator />} />
              <Route path="/tools/bulk-pdf-cropper" element={<BulkPdfCropper />} />
              <Route path="/invoicegen" element={<InvoicePage />} />
              <Route path="/docexplorer" element={<DocPage />} />
              <Route path="/docs/upload" element={<AddNewDoc />} />
              <Route path="/docs/list" element={<ViewDoc />} />
              <Route path="/formula-setup" element={<FormulaSetupPage />} />
            </Route>
            <Route path="/signin" element={<SignIn />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          </PageLoadingProvider>
        </SidebarProvider>
      </BrowserRouter>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
