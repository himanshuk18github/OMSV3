import React, { useEffect, useState, useContext } from "react";
import API_BASE_URL from '../../apicallconfig';
import { AuthContext } from '../../context/AuthContext';

const TOTPAdminPanel: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [otpauthUri, setOtpauthUri] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [issuer, setIssuer] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [authorized, setAuthorized] = useState<boolean>(false);

  // 🔒 Allowed usernames (case-insensitive)
  const allowedUsernames = ["admin", "superuser", "manager"];
  const username = user?.username?.toLowerCase() || "";
  const isAdmin = allowedUsernames.includes(username);

  useEffect(() => {
    if (isAdmin) {
      const fetchQR = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE_URL}/totp.php?action=get-qr`);
          const data = await res.json();
          if (data.status === "success" && data.otpauth_uri) {
            setOtpauthUri(data.otpauth_uri);
            setQrUrl(data.qr_url || null);
            setIssuer(data.issuer || "");
            setLabel(data.label || "");
          } else {
            setError(data.message || "QR code could not be loaded.");
          }
        } catch (err) {
          setError("Failed to fetch QR code.");
        } finally {
          setLoading(false);
        }
      };

      fetchQR();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  return (
    <div className="min-h-200px flex items-top justify-top bg-[#f9fafb]">
      <div className="glass-card w-full max-w-xl mx-auto p-8 rounded-2xl shadow-xl relative">
        <h2 className="app-page-title mb-4 text-indigo-700">TOTP Security Setup</h2>
        <p className="mb-6 text-gray-700">
          Scan this QR code in your Google or Microsoft Authenticator app to enable two-factor authentication for all users.
          <br />
          <span className="text-sm text-gray-500">
            This QR is shared for all users in the system.
          </span>
        </p>
        {!isAdmin ? (
          <div className="text-red-500">You are not authorized to view this QR code.</div>
        ) : loading ? (
          <div className="text-gray-500">Loading QR code...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          otpauthUri && (
            <div className="flex flex-col items-center">
              <div
                className={`transition-all duration-500 ease-in-out w-56 h-56 mb-4 rounded-xl overflow-hidden relative`}
                style={{ filter: authorized ? "none" : "blur(22px)", cursor: authorized ? "default" : "pointer" }}
                aria-label="QR code card"
              >
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="TOTP QR Code"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpauthUri)}`}
                    alt="TOTP QR Code"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                )}
                {!authorized && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60">
                    <span className="text-xl font-semibold text-gray-600">
                      QR Hidden
                    </span>
                  </div>
                )}
              </div>
              {!authorized ? (
                <button
                  className="mt-2 px-6 py-2 rounded-full bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition"
                  onClick={() => setAuthorized(true)}
                >
                  Yes, I am authorized
                </button>
              ) : (
                <div className="mt-2 text-xs break-all text-gray-600">
                  <b>Authenticator Name:</b> {issuer}
                  <br />
                  <b>Account Label:</b> {label}
                </div>
              )}
            </div>
          )
        )}
      </div>
      <style>
        {`
          .glass-card {
            background: rgba(255,255,255,0.25);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.09);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.18);
          }
        `}
      </style>
    </div>
  );
};

export default TOTPAdminPanel;
