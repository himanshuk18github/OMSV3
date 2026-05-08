import React, { useContext, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import API_BASE_URL from "../apicallconfig";
import InlineLoader from "../components/common/InlineLoader";

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getAccentClass(seed: string) {
  const swatches = [
    "from-sky-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-indigo-500 to-blue-500",
  ];

  const index = Math.abs(seed.split("").reduce((total, character) => total + character.charCodeAt(0), 0)) % swatches.length;
  return swatches[index];
}

export default function UserProfile() {
  const { user, loading: authLoading, logout } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const displayName = user?.name ?? user?.username ?? "Account";
  const email = user?.email ?? "Not available";
  const phone = user?.phone ?? "Not available";
  const roleName = user?.role?.display_name ?? user?.role?.name ?? "Team Member";
  const roleDescription = user?.role?.description ?? "No role description available.";
  const initials = useMemo(() => getInitials(user?.name, user?.email), [user?.name, user?.email]);
  const accentClass = useMemo(() => getAccentClass(displayName), [displayName]);

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Fill all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const token = sessionStorage.getItem("oms_auth_token");
      const response = await fetch(`${API_BASE_URL}/auth/password`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const validationMessage = data?.errors
          ? Object.values(data.errors).flat().join(" ")
          : data?.message;
        throw new Error(validationMessage || "Unable to change password.");
      }

      setMessage(data?.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      await logout();
      window.location.replace("/signin");
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "Unable to change password.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex justify-center">
          <InlineLoader message="Loading account..." />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        Session not available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-brand-800 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${accentClass} text-3xl font-bold text-white shadow-lg shadow-slate-900/30 ring-4 ring-white/25`}>
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                  Account profile
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-white">
                  {displayName}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {roleName}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {email}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm text-white/85 backdrop-blur">
              <p className="font-semibold text-white">Secure account</p>
              <p className="mt-1">Only the password is editable from this screen.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Name</p>
            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{displayName}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Email</p>
            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{email}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Phone</p>
            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{phone}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Role</p>
            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{roleName}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Role description</p>
            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{roleDescription}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Display name</p>
            <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{displayName}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
              Password security
            </p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
              Change password
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will revoke the active session after the password update.
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="mt-6 grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              autoComplete="current-password"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              autoComplete="new-password"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              autoComplete="new-password"
            />
          </label>

          <div className="lg:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-6 text-sm">
              {error ? <span className="text-red-600 dark:text-red-400">{error}</span> : null}
              {message ? <span className="text-emerald-600 dark:text-emerald-400">{message}</span> : null}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}