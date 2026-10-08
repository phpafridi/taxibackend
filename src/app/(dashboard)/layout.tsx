'use client';

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Spinner } from "react-bootstrap";
import Header from "../../layouts/header/Header";
import Sidebar from "../../layouts/Sidebar";
import { useEffect, useState } from "react";
import NotificationManager from '../../components/NotificationManager';
import {
  IconLayoutDashboard, IconCar, IconUsers,
  IconBook2, IconContract, IconProng, IconBell, IconHome,
} from "@tabler/icons-react";
import Link from "next/link";

interface DashboardProps { children: React.ReactNode; }

const BRAND = '#F5A623';

const adminTabs = [
  { href: "/cars",               icon: IconCar,      label: "Cars" },
  { href: "/drivers",            icon: IconUsers,    label: "Drivers" },
  { href: "/ledger",             icon: IconBook2,    label: "Ledger" },
  { href: "/admin",              icon: IconHome,     label: "Home",  center: true },
  { href: "/agreements",         icon: IconContract, label: "Agree." },
  { href: "/maint",              icon: IconProng,    label: "Maint" },
  { href: "/test-notifications", icon: IconBell,     label: "Notify" },
];

const DashboardLayout: React.FC<DashboardProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => {
    if (status === "unauthenticated") signOut({ callbackUrl: "/sign-in" });
  }, [status, router]);

  if (status === "loading") return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <Spinner animation="border" style={{ color: BRAND }} />
      <span className="ms-3">Loading...</span>
    </div>
  );

  if (!session) return null;

  if (session?.user?.role !== "ADMIN") return (
    <div className="d-flex justify-content-center align-items-center vh-100 flex-column">
      <h1 className="text-danger mb-4">⛔ Access Denied</h1>
      <p className="mb-4">You don't have permission to access the admin dashboard.</p>
      <button onClick={() => signOut({ callbackUrl: "/sign-in" })} className="btn btn-primary">Sign Out</button>
    </div>
  );

  return (
    <div>
      <div className="pwa-sidebar-wrap">
        <Sidebar hideLogo={false} containerId="miniSidebar" />
      </div>

      <div id="content" className="position-relative h-100">
        <NotificationManager />
        <Header />
        <div className="custom-container pwa-page-content">{children}</div>
        <div className="custom-container pwa-page-content"><span className="me-1">RS PRIVATE HIRE LTD</span></div>
      </div>

      {isClient && (
        <div className="pwa-bottom-nav-wrap d-md-none">
          <nav className="pwa-bottom-nav" aria-label="Main navigation">
            {adminTabs.map(({ href, icon: Icon, label, center }) => {
              const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
              if (center) {
                const dashActive = pathname === "/admin";
                return (
                  <Link key={href} href={href} className={"pwa-tab-item pwa-tab-center" + (dashActive ? " active" : "")}>
                    <span className="pwa-tab-center-bubble">
                      <Icon size={24} strokeWidth={dashActive ? 2.4 : 1.8} color="white" />
                    </span>
                  </Link>
                );
              }
              return (
                <Link key={href} href={href} className={"pwa-tab-item" + (isActive ? " active" : "")}>
                  <span className="pwa-tab-icon">
                    <Icon size={20} strokeWidth={isActive ? 2.1 : 1.5} />
                  </span>
                  <span className="pwa-tab-label">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 767px) {
          .pwa-sidebar-wrap,
          #miniSidebar { display: none !important; }

          .navbar-glass {
            width: 100% !important;
            border-bottom: 1px solid rgba(245,166,35,0.25) !important;
          }

          #content { margin-left: 0 !important; }

          .pwa-page-content {
            padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }

        /* Outer wrapper: full-width, provides the safe-area padding */
        .pwa-bottom-nav-wrap {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 1050;
          padding: 0 16px calc(12px + env(safe-area-inset-bottom, 0px));
          pointer-events: none;
        }

        /* The pill itself */
        .pwa-bottom-nav {
          pointer-events: all;
          display: flex;
          align-items: center;
          background: #1c1c1e;
          border-radius: 32px;
          height: 60px;
          padding: 0 6px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
          overflow: hidden;
        }

        /* Regular tab item */
        .pwa-tab-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 6px 2px;
          text-decoration: none;
          color: #8e8e93;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.15s ease, transform 0.12s ease;
        }
        .pwa-tab-item:active { transform: scale(0.88); }
        .pwa-tab-item.active { color: #ffffff; }

        .pwa-tab-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 28px;
          border-radius: 10px;
          transition: background 0.15s ease;
        }
        .pwa-tab-item.active .pwa-tab-icon {
          background: rgba(245,166,35,0.18);
        }

        .pwa-tab-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1;
        }
        .pwa-tab-item.active .pwa-tab-label {
          color: ${BRAND};
          font-weight: 700;
        }

        /* Center raised orange circle tab */
        .pwa-tab-center {
          flex: 0 0 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .pwa-tab-center-bubble {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: ${BRAND};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(245,166,35,0.40);
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .pwa-tab-center.active .pwa-tab-center-bubble {
          background: #d4880a;
          box-shadow: 0 6px 18px rgba(245,166,35,0.55);
          transform: scale(1.08);
        }
        .pwa-tab-center:active .pwa-tab-center-bubble {
          transform: scale(0.92);
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
