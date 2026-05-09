import React, { ReactNode, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Preloader from "./common/Preloader";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  const routePermissionMap: Array<{ prefix: string; permission: string }> = [
    { prefix: "/items", permission: "inventory" },
    { prefix: "/sales-orders", permission: "sales_orders" },
    { prefix: "/update-sales-orders", permission: "sales_orders" },
    { prefix: "/packages", permission: "packages" },
    { prefix: "/returns", permission: "returns" },
    { prefix: "/invoicegen", permission: "invoices" },
    { prefix: "/vendors", permission: "vendors" },
    { prefix: "/settlement", permission: "settlements" },
    { prefix: "/reports", permission: "reports" },
    { prefix: "/support", permission: "tickets" },
    { prefix: "/users", permission: "users" },
    { prefix: "/tools", permission: "tools" },
    { prefix: "/docexplorer", permission: "documents" },
    { prefix: "/docs", permission: "documents" },
    { prefix: "/import", permission: "import" },
    { prefix: "/formula-setup", permission: "formula_setup" },
  ];

  if (loading) {
    return <Preloader isLoading={true} fullScreen={true} />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  const isAdmin = (user?.role?.name || "").toLowerCase() === "admin";
  if (!isAdmin) {
    const rolePermissions = user?.role_permissions || user?.role?.permissions || {};
    const mapping = routePermissionMap.find((m) => location.pathname === m.prefix || location.pathname.startsWith(`${m.prefix}/`));
    if (mapping && !rolePermissions?.[mapping.permission]?.view) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
