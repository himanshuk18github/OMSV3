import { useEffect, useState, useContext } from "react";
import { useSidebar } from "../context/SidebarContext";
import UserDropdown from "../components/header/UserDropdown";
import { AuthContext } from "../context/AuthContext";
import { useOverlay } from "./OverlayContext";

// IST helpers
const days = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];
function pad(n: number) { return n < 10 ? `0${n}` : n; }
function getISTTime() {
  const now = new Date();
  // IST is UTC+5:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + 5.5 * 60 * 60000);
  const day = days[istTime.getDay()];
  const date = `${pad(istTime.getDate())}/${pad(istTime.getMonth() + 1)}/${istTime.getFullYear()}`;
  const time = `${pad(istTime.getHours())}:${pad(istTime.getMinutes())}:${pad(istTime.getSeconds())}`;
  return { day, date, time };
}

const AppHeader: React.FC = () => {
  const [ist, setIst] = useState(getISTTime());
  const { user } = useContext(AuthContext);
  const { overlayOpen } = useOverlay();
  const { toggleMobileSidebar } = useSidebar();

  useEffect(() => {
    const timer = setInterval(() => setIst(getISTTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  // hide header if any overlay/modal is open
  if (overlayOpen) return null;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="box-border flex h-16 items-center justify-between gap-4 px-4 dark:border-gray-800 lg:gap-6 lg:px-6">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={toggleMobileSidebar}
          className="items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg md:hidden dark:border-gray-800 dark:text-gray-400"
          aria-label="Toggle Sidebar"
        >
          <svg
            width="16"
            height="12"
            viewBox="0 0 16 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {/* Header Content */}
        <div className="flex flex-1 items-center justify-between gap-3">
          <div className="min-w-0 flex flex-wrap items-center gap-2 md:gap-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              Welcome, {user?.name ?? user?.username ?? "User"}
            </h1>

            <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400 whitespace-nowrap">
              {user?.role?.display_name ?? user?.role?.name ?? "Team Member"}
            </span>

            <div className="hidden h-6 border-l border-gray-200 dark:border-gray-800 lg:block" />

            <div className="hidden text-left lg:block whitespace-nowrap">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {ist.day}, {ist.date}
              </p>
              <p className="text-xs font-semibold tracking-wide text-gray-600 dark:text-gray-400">
                {ist.time} IST
              </p>
            </div>
          </div>

          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;