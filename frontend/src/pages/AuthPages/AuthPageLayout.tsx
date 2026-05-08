import React from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout-container">
      <div className="left-pane">
        <div className="branding">
          <Link to="/">
            <img
              src="https://app.apnistationery.com/FULLSIZE.png"
              alt="Apni Stationery"
              className="logo"
            />
          </Link>
          <h1>Welcome Back</h1>
          <p>Apni Stationery - Order Management System V3</p>
          <ul className="features">
            <li>✔ Real-time Inventory</li>
            <li>✔ Automated Order Processing</li>
            <li>✔ Advanced Analytics</li>
            <li>✔ Multi-location Support</li>
            <li>✔ Customer Management</li>
          </ul>
        </div>
      </div>

      <div className="right-pane">
        <div className="form-container">
          <div className="text-center">
            
                      </div>

          <div className="auth-form">{children}</div>

          <div className="footer">
            <p>Proudly Developed by Himanshu Kumar Poddar</p>
            <p>© 2026 Apni Stationery. All rights reserved.</p>
            <p>Version 3.0</p>
          </div>
        </div>
      </div>

      <style>{`
        .auth-layout-container {
          display: flex;
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
          background: linear-gradient(135deg, #181e4b 50%, #1f245d 50%);
          color: #ffffff;
          font-family: 'Segoe UI', sans-serif;
        }

        .left-pane {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .branding {
          max-width: 400px;
          text-align: left;
        }

        .branding .logo {
          width: 220px;
          margin-bottom: 20px;
        }

        .branding h1 {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .branding p {
          font-size: 16px;
          color: #cbd5e0;
          margin-bottom: 24px;
        }

        .features {
          list-style: none;
          padding: 0;
        }

        .features li {
          margin-bottom: 10px;
          font-size: 14px;
          color: #cbd5e0;
        }

        .right-pane {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          overflow: hidden;
        }

        .form-container {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.04);
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
          animation: fadeInUp 0.6s ease;
          max-height: calc(100dvh - 24px);
          overflow: hidden;
        }

        .text-center {
          text-align: center;
          margin-bottom: 24px;
        }

        .mobile-logo {
          width: 180px;
          margin-bottom: 10px;
        }

        h2 {
          font-size: 24px;
          margin-bottom: 8px;
        }

        p {
          color: #a0aec0;
          font-size: 14px;
        }

        .auth-form input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 8px;
          background: #ffffff;
          border: 1px solid #d0d7e3;
          color: #111827;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .auth-form input:focus {
          border-color: #181e4b;
          outline: none;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.3);
        }

        .auth-form button[type="submit"] {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #181e4b, #181e4b);
          border: none;
          border-radius: 8px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .auth-form button[type="submit"]:hover {
          background: linear-gradient(135deg, #181e4b, #2c5282);
          transform: translateY(-2px);
        }

        .footer {
          text-align: center;
          font-size: 12px;
          color: #a0aec0;
          margin-top: 24px;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1024px) {
          .left-pane {
            display: none;
          }

          .right-pane {
            flex: 1;
            background-color: #181e4b;
          }
        }
      `}</style>
    </div>
  );
}
