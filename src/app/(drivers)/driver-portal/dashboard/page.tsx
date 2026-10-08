'use client';

import { Fragment, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Spinner } from "react-bootstrap";
import { Col, Row } from "react-bootstrap";

//import custom components
import DashboardStats from "../../../../components/driver-portal/dashboard/DashboardStats";



const HomePage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Check session and redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {

      signOut({ callbackUrl: "/sign-in" });
    }
  }, [status, router]);

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="warning" />
        <span className="ms-3">Loading dashboard...</span>
      </div>
    );
  }

  // If not authenticated, show nothing (will redirect in useEffect)
  if (!session) {
    return null;
  }

  // If session exists but user is not ADMIN, show unauthorized message
  if (session?.user?.role !== "DRIVER") {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 flex-column">
        <h1 className="text-danger mb-4">⛔ Access Denied</h1>
        <p className="mb-4">You don't have permission to access the admin dashboard.</p>
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="btn btn-primary"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <Fragment>
      {/* Add welcome message with user info */}
      <div className="mb-4">
        <h1 className="h3">Welcome back, {session?.user?.name || session?.user?.email}!</h1>
        <p className="text-muted mb-0">Here's what's happening with your dashboard today.</p>
      </div>

      <Row className="g-6 mb-6">
        <DashboardStats />
      </Row>
      <Row className="g-6 mb-6">
        <Col xl={12}>
          
          

        </Col>
      </Row>
    </Fragment>
  );
};

export default HomePage;