import React, { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import API_BASE_URL from "../../apicallconfig";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const { login } = useContext(AuthContext);
  const lightInputStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    color: "#111827",
    borderColor: "#dbe3ef",
    caretColor: "#111827",
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (showForgot) {
      return;
    }

    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const ok = await login(email.trim(), password);
      if (ok) {
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          window.location.href = "/";
        }, 600);
      } else {
        setError("Invalid email or password.");
      }
    } catch {
      setError("Network error. Please check backend URL/CORS and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp() {
    setForgotError("");
    setForgotSuccess("");

    if (!email.trim()) {
      setForgotError("Please enter your registered email.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.message || data?.errors?.email?.[0] || "Failed to send OTP.";
        setForgotError(message);
        return;
      }

      setOtpSent(true);
      setOtpVerified(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setForgotSuccess("OTP sent to your registered email.");
    } catch {
      setForgotError("Network error while sending OTP.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function verifyOtp() {
    setForgotError("");
    setForgotSuccess("");

    const otp = otpDigits.join("");
    if (!email.trim() || otp.length !== 6) {
      setForgotError("Email and OTP are required.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.message || data?.errors?.otp?.[0] || "OTP verification failed.";
        setForgotError(message);
        return;
      }

      setOtpVerified(true);
      setForgotSuccess("OTP verified. Please set your new password.");
    } catch {
      setForgotError("Network error while verifying OTP.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function resetPassword() {
    setForgotError("");
    setForgotSuccess("");

    const otp = otpDigits.join("");
    if (!otpVerified) {
      setForgotError("Please verify OTP first.");
      return;
    }

    if (otp.length !== 6) {
      setForgotError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (newPassword.length < 8) {
      setForgotError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError("Password and confirm password do not match.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          data?.message ||
          data?.errors?.password?.[0] ||
          data?.errors?.otp?.[0] ||
          "Password reset failed.";
        setForgotError(message);
        return;
      }

      setForgotSuccess("Password reset successful. Please sign in with your new password.");
      setShowForgot(false);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpSent(false);
      setOtpVerified(false);
    } catch {
      setForgotError("Network error while resetting password.");
    } finally {
      setForgotLoading(false);
    }
  }

  function updateOtpDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 1);
    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);

    if (clean && index < 5) {
      const nextInput = document.getElementById(`otp-box-${index + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, idx) => {
      next[idx] = char;
    });
    setOtpDigits(next);
    const focusIndex = Math.min(pasted.length, 6) - 1;
    const target = document.getElementById(`otp-box-${Math.max(focusIndex, 0)}`) as HTMLInputElement | null;
    target?.focus();
  }

  function handleOtpKeyDown(index: number, key: string) {
    if (key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-box-${index - 1}`) as HTMLInputElement | null;
      prevInput?.focus();
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!showForgot) {
      await handleLogin(e);
      return;
    }

    if (!otpSent) {
      await sendOtp();
      return;
    }

    if (!otpVerified) {
      await verifyOtp();
      return;
    }

    await resetPassword();
  }

  return (
    <div className="flex w-full justify-center px-4 py-2 sm:px-6">
      <div className="w-full max-w-[430px] rounded-2xl border border-white/20 bg-white px-6 py-6 shadow-xl sm:px-8">
        <div className="mb-4 text-center">
          <h2 className="mb-1 text-3xl font-extrabold tracking-tight text-gray-800">Sign in</h2>
          <p className="text-sm text-gray-500">Use your OMS account credentials</p>
        </div>

        <form onSubmit={handleFormSubmit} autoComplete="off">
          <div className="mb-4">
            <input
              type="email"
              className="h-12 w-full rounded-lg border-2 px-4 text-[15px] transition focus:border-blue-500 focus:outline-none"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              disabled={loading || forgotLoading}
              style={lightInputStyle}
            />
          </div>

          {!showForgot && (
            <div className="mb-2">
              <input
                type="password"
                className="h-12 w-full rounded-lg border-2 px-4 text-[15px] transition focus:border-blue-500 focus:outline-none"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                style={lightInputStyle}
              />
            </div>
          )}

          <div className="mb-4 text-right">
            <button
              type="button"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              onClick={() => {
                setShowForgot((prev) => !prev);
                setForgotError("");
                setForgotSuccess("");
                setError("");
                setSuccess("");
              }}
              disabled={loading || forgotLoading}
            >
              {showForgot ? "Hide Forgot Password" : "Forgot Password?"}
            </button>
          </div>

          {!showForgot && error && <div className="mb-4 text-red-600 text-sm text-center">{error}</div>}
          {!showForgot && success && <div className="mb-4 text-green-600 text-sm text-center">{success}</div>}

          {showForgot && (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/35 p-3">
              <div className="mb-2 text-sm font-bold text-gray-700">Reset Password via OTP</div>

              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  className="h-10 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
                  onClick={sendOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                </button>
              </div>

              {otpSent && (
                <>
                  <div className="mb-3 flex justify-between gap-2">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-box-${index}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        className="h-12 w-12 rounded-lg border-2 text-center transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={digit}
                        onChange={(e) => updateOtpDigit(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e.key)}
                        onPaste={handleOtpPaste}
                        disabled={forgotLoading || otpVerified}
                        style={{
                          backgroundColor: "#ffffff",
                          color: "#000000",
                          borderColor: "#d0d7e3",
                          caretColor: "#000000",
                          fontFamily: "system-ui, Arial, sans-serif",
                          fontWeight: "700",
                          fontSize: "24px",
                          letterSpacing: "0.1em",
                        }}
                      />
                    ))}

                  </div>

                  <button
                      type="button"
                      className="mb-2 h-10 w-full rounded-lg border border-blue-500 px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                      onClick={verifyOtp}
                      disabled={forgotLoading || otpVerified}
                    >
                      {otpVerified ? "Verified" : "Verify"}
                    </button>

                  <input
                    type="password"
                    className="mb-2 h-11 w-full rounded-lg border-2 px-4 text-sm transition focus:border-blue-500 focus:outline-none"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={forgotLoading || !otpVerified}
                    style={lightInputStyle}
                  />

                  <input
                    type="password"
                    className="mb-2 h-11 w-full rounded-lg border-2 px-4 text-sm transition focus:border-blue-500 focus:outline-none"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={forgotLoading || !otpVerified}
                    style={lightInputStyle}
                  />

                  <button
                    type="button"
                    className="h-10 w-full rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    onClick={resetPassword}
                    disabled={forgotLoading || !otpVerified}
                  >
                    {forgotLoading ? "Updating..." : "Reset Password"}
                  </button>
                </>
              )}

              {forgotError && <div className="mt-3 break-words rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{forgotError}</div>}
              {forgotSuccess && <div className="mt-3 break-words rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{forgotSuccess}</div>}
            </div>
          )}

          {!showForgot && (
            <button
              type="submit"
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-lg transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
