"use client";
import React, { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import { useMediaQuery } from "react-responsive";
import { IconArrowBarLeft, IconArrowBarRight, IconBell } from "@tabler/icons-react";
import { Container, ListGroup, Navbar, Button } from "react-bootstrap";
import Image from 'next/image';

import UserMenu from "./UserMenu";
import Flex from "../../../components/common/Flex";
import NoficationList from "../../../components/common/NotifcationListDriver";
import OffcanvasSidebar from "../../../layouts/driver-portal/OffcanvasSidebar";
import useMenu from "../../../hooks/useMenu";

const Header = () => {
  const [isNoficationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { handleCollapsed } = useMenu();

  const isTablet = useMediaQuery({ maxWidth: 990 });
  const isMobile = useMediaQuery({ maxWidth: 767 });

  useEffect(() => {
    fetchNotificationCount();

    // Refetch when tab becomes visible (user switches back to tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotificationCount();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Refetch when SW sends REFETCH message (push notification received)
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REFETCH') fetchNotificationCount();
    };
    navigator.serviceWorker?.addEventListener('message', handleSwMessage);

    // Refetch when foreground push notification received
    const handleForegroundPush = () => fetchNotificationCount();
    window.addEventListener('rs-refetch', handleForegroundPush);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
      window.removeEventListener('rs-refetch', handleForegroundPush);
    };
  }, []);

  useEffect(() => {
    if (!isNoficationOpen) setTimeout(() => fetchNotificationCount(true), 500);
  }, [isNoficationOpen]);

  const fetchNotificationCount = async (withDetails = false) => {
    try {
      const response = await fetch(`/api/notification/driver${withDetails ? '?details=true' : ''}`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  return (
    <Fragment>
      <Navbar expand="lg" className="navbar-glass px-0 px-lg-4">
        <Container fluid className="px-lg-0 position-relative">

          {/* Left — sidebar collapse (desktop only) */}
          <Flex alignItems="center" className="gap-4">
            {!isMobile && !isTablet && (
              <Link href={"#"} className="sidebar-toggle d-flex p-3">
                <span className="collapse-mini" onClick={() => handleCollapsed("expanded")}>
                  <IconArrowBarLeft size={20} strokeWidth={1.5} className="text-secondary" />
                </span>
                <span className="collapse-expanded" onClick={() => handleCollapsed("collapsed")}>
                  <IconArrowBarRight size={20} strokeWidth={1.5} className="text-secondary" />
                </span>
              </Link>
            )}
            {isMobile && <div style={{ width: 40 }} />}
          </Flex>

          {/* Center — logo */}
          <div className="position-absolute top-50 start-50 translate-middle d-flex align-items-center">
            <Image
              src="/images/brand/logo/logo-icon2.svg"
              alt="RS Private Hire"
              width={isMobile ? 90 : 110}
              height={isMobile ? 24 : 30}
              className="img-fluid"
              style={{ objectFit: 'contain' }}
            />
          </div>

          {/* Right — Bell + User */}
          <ListGroup bsPrefix="list-unstyled" as="ul" className="d-flex align-items-center mb-0 gap-2 ms-auto">
            <ListGroup.Item as="li">
              <Button variant="ghost" className="position-relative btn-icon rounded-circle" onClick={() => setIsNotificationOpen(true)}>
                <IconBell size={20} />
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger mt-2 ms-n2">
                    {unreadCount > 99 ? '99+' : unreadCount}
                    <span className="visually-hidden">unread messages</span>
                  </span>
                )}
              </Button>
            </ListGroup.Item>
            <ListGroup.Item as="li"><UserMenu /></ListGroup.Item>
          </ListGroup>
        </Container>
      </Navbar>

      <NoficationList isOpen={isNoficationOpen} onClose={() => setIsNotificationOpen(false)} />
      {isTablet && !isMobile && <OffcanvasSidebar />}
    </Fragment>
  );
};

export default Header;
