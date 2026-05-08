import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import { useSidebar } from "../context/SidebarContext";

const LayoutContent: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppSidebar />
      
      <div className="flex flex-1 flex-col overflow-hidden md:ml-64">
        <AppHeader />
        
        {/* Mobile backdrop - Close sidebar on mobile when clicking outside */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/30 md:hidden"
            onClick={toggleMobileSidebar}
          />
        )}
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return <LayoutContent />;
};

export default AppLayout;
