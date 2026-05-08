import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import { AuthContext } from "../context/AuthContext";

// Import icons from @heroicons/react
import {
  HomeIcon,
  CubeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  WrenchIcon,
} from "@heroicons/react/24/outline";

type SidebarItem = {
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  path: string;
  permissionKey: string;
  extraActivePaths?: string[];
};

const navItems: SidebarItem[] = [
  { name: "Dashboard", icon: HomeIcon, path: "/", permissionKey: "dashboard" },
  { name: "Products Inventory", icon: CubeIcon, path: "/items", permissionKey: "inventory" },
  { name: "Packages", icon: ArchiveBoxIcon, path: "/packages", permissionKey: "packages" },
  {
    name: "Sales Orders",
    icon: ClipboardDocumentListIcon,
    path: "/sales-orders",
    permissionKey: "sales_orders",
    extraActivePaths: ["/update-sales-orders"],
  },
  { name: "Returns", icon: ArrowPathIcon, path: "/returns", permissionKey: "returns" },
  { name: "Invoices", icon: DocumentTextIcon, path: "/invoicegen", permissionKey: "invoices" },
  { name: "Manage Vendors", icon: UserGroupIcon, path: "/vendors", permissionKey: "vendors" },
  { name: "Payments Received", icon: BanknotesIcon, path: "/settlement", permissionKey: "settlements" },
  { name: "Reports", icon: ChartBarIcon, path: "/reports", permissionKey: "reports" },
  { name: "Ticket Support", icon: ClipboardDocumentListIcon, path: "/support", permissionKey: "tickets" },
];

const othersItems: SidebarItem[] = [
  { name: "Users", icon: UserGroupIcon, path: "/users", permissionKey: "users" },
  { name: "Tools", icon: WrenchIcon, path: "/tools", permissionKey: "tools" },
  {
    name: "Document Manager",
    icon: DocumentTextIcon,
    path: "/docexplorer",
    permissionKey: "documents",
    extraActivePaths: ["/docs"],
  },
  { name: "Import", icon: ClipboardDocumentListIcon, path: "/import", permissionKey: "import" },
  { name: "Formula Setup", icon: DocumentTextIcon, path: "/formula-setup", permissionKey: "formula_setup" },
];

const AppSidebar = () => {
  const { user } = useContext(AuthContext) as any;
  const location = useLocation();
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  const [isOthersOpen, setIsOthersOpen] = useState(true);

  const rolePermissions = user?.role_permissions || user?.role?.permissions || {};
  const isAdmin = (user?.role?.name || "").toLowerCase() === "admin";

  const canView = useCallback((permissionKey: string) => {
    if (isAdmin) {
      return true;
    }

    return Boolean(rolePermissions?.[permissionKey]?.view);
  }, [isAdmin, rolePermissions]);

  const visibleNavItems = navItems.filter((item) => canView(item.permissionKey));
  const visibleOthersItems = othersItems.filter((item) => canView(item.permissionKey));

  const isActive = useCallback(
    (item: SidebarItem) => {
      const paths = [item.path, ...(item.extraActivePaths ?? [])];

      return paths.some((basePath) => {
        if (!basePath) {
          return false;
        }

        if (basePath === "/") {
          return location.pathname === "/";
        }

        return location.pathname === basePath || location.pathname.startsWith(`${basePath}/`);
      });
    },
    [location.pathname],
  );

  useEffect(() => {
    if (visibleOthersItems.some((item) => isActive(item))) {
      setIsOthersOpen(true);
    }
  }, [isActive, visibleOthersItems]);

  return (
    <>
      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800"
      >
        {/* Logo Section */}
        <div className="box-border flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <img
              src="https://apnistationery.com/wp-content/uploads/2024/12/HED_1.png"
              alt="ApniStationery"
              className="h-8 w-auto"
            />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Apni Stationery
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
          {/* Main Navigation */}
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <li key={item.name} className="list-none">
                  {item.path ? (
                    <Link
                      to={item.path}
                      className={`menu-item group ${
                        active ? "menu-item-active" : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={`menu-item-icon-size ${
                          active
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="menu-item-text">{item.name}</span>
                    </Link>
                  ) : (
                    <span className="menu-item cursor-not-allowed opacity-50">
                      <span className="menu-item-icon-size menu-item-icon-inactive">
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="menu-item-text">{item.name}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </nav>

          {/* Others Section */}
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setIsOthersOpen((prev) => !prev)}
              className="flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              <span>Others</span>
              {isOthersOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </button>
            {isOthersOpen ? (
              <nav className="mt-4 space-y-1">
                {visibleOthersItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <li key={item.name} className="list-none">
                      {item.path ? (
                        <Link
                          to={item.path}
                          className={`menu-item group ${
                            active ? "menu-item-active" : "menu-item-inactive"
                          }`}
                        >
                          <span
                            className={`menu-item-icon-size ${
                              active
                                ? "menu-item-icon-active"
                                : "menu-item-icon-inactive"
                            }`}
                          >
                            <Icon className="h-6 w-6" />
                          </span>
                          <span className="menu-item-text">{item.name}</span>
                        </Link>
                      ) : (
                        <span className="menu-item cursor-not-allowed opacity-50">
                          <span className="menu-item-icon-size menu-item-icon-inactive">
                            <Icon className="h-6 w-6" />
                          </span>
                          <span className="menu-item-text">{item.name}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </nav>
            ) : null}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 transform bg-white transition-transform duration-300 dark:bg-gray-900 md:hidden flex flex-col border-r border-gray-200 dark:border-gray-800 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <img
              src="https://apnistationery.com/wp-content/uploads/2024/12/HED_1.png"
              alt="ApniStationery"
              className="h-8 w-auto"
            />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Apni Stationery
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
          {/* Main Navigation */}
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <li key={item.name} className="list-none">
                  {item.path ? (
                    <Link
                      to={item.path}
                      onClick={() => toggleMobileSidebar()}
                      className={`menu-item group ${
                        active ? "menu-item-active" : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={`menu-item-icon-size ${
                          active
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="menu-item-text">{item.name}</span>
                    </Link>
                  ) : (
                    <span className="menu-item cursor-not-allowed opacity-50">
                      <span className="menu-item-icon-size menu-item-icon-inactive">
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="menu-item-text">{item.name}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </nav>

          {/* Others Section */}
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setIsOthersOpen((prev) => !prev)}
              className="flex w-full items-center justify-between px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              <span>Others</span>
              {isOthersOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </button>
            {isOthersOpen ? (
              <nav className="mt-4 space-y-1">
                {visibleOthersItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <li key={item.name} className="list-none">
                      {item.path ? (
                        <Link
                          to={item.path}
                          onClick={() => toggleMobileSidebar()}
                          className={`menu-item group ${
                            active ? "menu-item-active" : "menu-item-inactive"
                          }`}
                        >
                          <span
                            className={`menu-item-icon-size ${
                              active
                                ? "menu-item-icon-active"
                                : "menu-item-icon-inactive"
                            }`}
                          >
                            <Icon className="h-6 w-6" />
                          </span>
                          <span className="menu-item-text">{item.name}</span>
                        </Link>
                      ) : (
                        <span className="menu-item cursor-not-allowed opacity-50">
                          <span className="menu-item-icon-size menu-item-icon-inactive">
                            <Icon className="h-6 w-6" />
                          </span>
                          <span className="menu-item-text">{item.name}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </nav>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;