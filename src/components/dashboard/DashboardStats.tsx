"use client";

import { JSX, useEffect, useState } from "react";
import { Container, Row, Col, Card, CardBody, Spinner, Badge, Button } from "react-bootstrap";
import {
  IconCar,
  IconUsers,
  IconContract,
  IconBook2,
  IconTool,
  IconBell,
  IconChevronRight,
  IconRefresh,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSessionChecker } from "@/hooks/useSessionChecker";
import { toast } from "sonner";

type Stat = {
  title: string;
  value: number | string;
  icon: JSX.Element;
  bgColor: string;
  textColor: string;
  link: string;
  badge?: string;
  badgeColor?: string;
  gradient: string;
  shadowColor: string;
};

const DashboardStats = () => {
  
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [maintenanceCount, setMaintenanceCount] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Fetch maintenance count from API
  const fetchMaintenanceCount = async () => {
    try {
      const res = await fetch("/api/driver-portal/maintenance-all");
      const json = await res.json();

      if (json.success && json.data) {
        const count = json.data.length || 0;
        setMaintenanceCount(count);
        return count;
      }
      return 0;
    } catch (err) {
      console.error("Failed to fetch maintenance count:", err);
      return 0;
    }
  };

  // Main function to load stats
  const loadStats = async (showRefreshSpinner = false) => {
    try {
      if (showRefreshSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();

      // Fetch notifications count
      let notificationCount = 0;
      try {
        const notifRes = await fetch("/api/dashboard/notifications/count");
        const notifData = await notifRes.json();
        notificationCount = notifData.count || 0;
        setNotificationCount(notificationCount);
      } catch (notifError) {
        console.error("Failed to load notifications:", notifError);
      }

      // Fetch maintenance count
      const maintenanceCount = await fetchMaintenanceCount();

      const newStats: Stat[] = [
        {
          title: "Total Cars",
          value: data.totalCars ?? 0,
          icon: <IconCar size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-orange",
          textColor: "text-amber-600",
          link: "/cars",
          gradient: "linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(251, 146, 60, 0.3)",
        },
        {
          title: "Total Drivers",
          value: data.totalDrivers ?? 0,
          icon: <IconUsers size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-blue",
          textColor: "text-blue-600",
          link: "/drivers",
          gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(59, 130, 246, 0.3)",
        },
        {
          title: "Total Agreements",
          value: data.totalAgreements ?? 0,
          icon: <IconContract size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-emerald",
          textColor: "text-emerald-600",
          link: "/agreements",
          gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(16, 185, 129, 0.3)",
        },
        {
          title: "Ledger Pending Requests",
          value: data.totalLedger ?? 0,
          icon: <IconBook2 size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-purple",
          textColor: "text-violet-600",
          link: "/ledger",
          gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(139, 92, 246, 0.3)",
        },
        {
          title: "Maintenance Requests",
          value: maintenanceCount,
          icon: <IconTool size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-red",
          textColor: "text-rose-600",
          link: "/maint",
          badge: maintenanceCount > 0 ? "Active" : "None",
          badgeColor: maintenanceCount > 0 
            ? "bg-gradient-to-r from-rose-500 to-pink-500" 
            : "bg-gradient-to-r from-gray-500 to-slate-500",
          gradient: "linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(244, 63, 94, 0.3)",
        },
        {
          title: "Driver Notifications",
          value: '',
          icon: <IconBell size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-indigo",
          textColor: "text-indigo-600",
          link: "/test-notifications",
          badge: notificationCount > 0 ? `${notificationCount} New` : "All Caught Up",
          badgeColor: notificationCount > 0 
            ? "bg-gradient-to-r from-indigo-500 to-purple-500" 
            : "bg-gradient-to-r from-emerald-500 to-teal-500",
          gradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(99, 102, 241, 0.3)",
        },
      ];

      setStats(newStats);
    } catch (error) {
      console.error("Failed to load stats", error);
      const fallbackMaintenanceCount = await fetchMaintenanceCount();
      
      setStats([
        {
          title: "Total Cars",
          value: 0,
          icon: <IconCar size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-orange",
          textColor: "text-amber-600",
          link: "/cars",
          gradient: "linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(251, 146, 60, 0.3)",
        },
        {
          title: "Total Drivers",
          value: 0,
          icon: <IconUsers size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-blue",
          textColor: "text-blue-600",
          link: "/drivers",
          gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(59, 130, 246, 0.3)",
        },
        {
          title: "Total Agreements",
          value: 0,
          icon: <IconContract size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-emerald",
          textColor: "text-emerald-600",
          link: "/agreements",
          gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(16, 185, 129, 0.3)",
        },
        {
          title: "Ledger",
          value: 0,
          icon: <IconBook2 size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-purple",
          textColor: "text-violet-600",
          link: "/ledger",
          gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(139, 92, 246, 0.3)",
        },
        {
          title: "Maintenance Requests",
          value: fallbackMaintenanceCount,
          icon: <IconTool size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-red",
          textColor: "text-rose-600",
          link: "/maint",
          badge: fallbackMaintenanceCount > 0 ? "Active" : "None",
          badgeColor: fallbackMaintenanceCount > 0 
            ? "bg-gradient-to-r from-rose-500 to-pink-500" 
            : "bg-gradient-to-r from-gray-500 to-slate-500",
          gradient: "linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(244, 63, 94, 0.3)",
        },
        {
          title: "Driver Notifications",
          value: '',
          icon: <IconBell size={isMobile ? 24 : 28} strokeWidth={1.8} />,
          bgColor: "bg-gradient-indigo",
          textColor: "text-indigo-600",
          link: "/test-notifications",
          badge: "All Caught Up",
          badgeColor: "bg-gradient-to-r from-emerald-500 to-teal-500",
          gradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)",
          shadowColor: "rgba(99, 102, 241, 0.3)",
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [isMobile]); // Re-fetch with correct icon sizes when mobile state changes

  const handleRefresh = () => {
    loadStats(true);
    toast.info("Refreshing dashboard stats...");
  };

  // Handle card press for mobile (replaces hover)
  const handleCardPress = (index: number) => {
    if (isMobile) {
      setHoveredCard(hoveredCard === index ? null : index);
    }
  };

  if (loading) {
    return (
      <Container fluid className="px-3 px-md-4 py-3">
        <div className="text-center py-8">
          <div className="d-flex flex-column align-items-center gap-4">
            <Spinner 
              animation="border" 
              variant="warning"
              style={{
                width: '56px',
                height: '56px',
                borderWidth: '3px',
              }}
            />
            <div className="text-muted fw-medium">
              Loading dashboard...
            </div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      {/* Main Content */}
      <Container fluid className="px-3 px-md-4 py-3">
        {/* Header */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">Dashboard Overview</h2>
              <p className="text-muted mb-0">
                Real-time statistics and key metrics
              </p>
            </div>
            
            {/* Desktop Refresh Button */}
            <Button
              variant="outline-warning"
              onClick={handleRefresh}
              disabled={refreshing}
              className="d-flex align-items-center gap-2 d-none d-md-flex"
            >
              {refreshing ? (
                <Spinner 
                  animation="border" 
                  size="sm"
                  style={{ 
                    width: '16px', 
                    height: '16px',
                    borderWidth: '2px'
                  }}
                />
              ) : (
                <IconRefresh size={18} />
              )}
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <Row className="g-3 g-md-4">
          {stats.map((stat, index) => (
            <Col xl={3} lg={4} md={6} sm={6} xs={12} key={index} className="mb-3 mb-md-4">
              <Link href={stat.link} className="text-decoration-none">
                <Card 
                  className={`border-0 overflow-hidden h-100 ${isMobile ? 'mobile-card' : ''}`}
                  style={{
                    minHeight: isMobile ? '130px' : '160px',
                    borderRadius: isMobile ? '16px' : '24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: stat.gradient,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: (hoveredCard === index || (isMobile && hoveredCard === index))
                      ? `0 10px 20px ${stat.shadowColor}, 0 4px 8px rgba(0, 0, 0, 0.1)`
                      : '0 4px 12px rgba(0, 0, 0, 0.06)',
                    position: 'relative',
                    transform: (hoveredCard === index || (isMobile && hoveredCard === index)) 
                      ? (isMobile ? 'translateY(-2px) scale(1.01)' : 'translateY(-8px) scale(1.02)') 
                      : 'translateY(0) scale(1)',
                  }}
                  onMouseEnter={() => !isMobile && setHoveredCard(index)}
                  onMouseLeave={() => !isMobile && setHoveredCard(null)}
                  onTouchStart={() => handleCardPress(index)}
                >
                  {/* Animated background glow */}
                  <div 
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{
                      background: `radial-gradient(circle at 30% 20%, ${stat.shadowColor}15 0%, transparent 70%)`,
                      opacity: (hoveredCard === index || (isMobile && hoveredCard === index)) ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                  
                  {/* Corner accent */}
                  {!isMobile && (
                    <div 
                      className="position-absolute top-0 end-0 w-20 h-20"
                      style={{
                        background: `linear-gradient(135deg, ${stat.shadowColor}20 0%, transparent 50%)`,
                        borderBottomLeftRadius: '100%',
                      }}
                    />
                  )}
                  
                  <CardBody className="d-flex flex-column justify-content-between p-4 p-md-5 h-100 position-relative">
                    {/* Badge */}
                    {stat.badge && (
                      <div className="position-absolute top-0 end-0 m-3 m-md-4" style={{ zIndex: 1 }}>
                        <Badge 
                          pill 
                          className={`${stat.badgeColor} px-2 px-md-3 py-1 border-0 shadow-sm`}
                          style={{
                            fontSize: isMobile ? '11px' : '12px',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            backdropFilter: 'blur(4px)',
                          }}
                        >
                          {stat.badge}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="d-flex justify-content-between align-items-start mb-3 mb-md-4">
                      <div>
                        <div 
                          className="fw-medium mb-1 mb-md-2"
                          style={{
                            fontSize: isMobile ? '13px' : '14px',
                            color: '#64748B',
                            letterSpacing: '0.3px',
                          }}
                        >
                          {stat.title}
                        </div>
                        <div 
                          className="fw-bold"
                          style={{
                            fontSize: isMobile ? '28px' : '36px',
                            color: '#0F172A',
                            lineHeight: '1.1',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                            minHeight: isMobile ? '34px' : '42px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                        </div>
                      </div>
                      
                      {/* Icon with glass effect */}
                      <div 
                        className="rounded-2 d-flex align-items-center justify-content-center"
                        style={{
                          backgroundColor: `${stat.textColor}15`,
                          backdropFilter: 'blur(8px)',
                          width: isMobile ? '48px' : '64px',
                          height: isMobile ? '48px' : '64px',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          boxShadow: `inset 0 1px 3px rgba(255, 255, 255, 0.3), 0 3px 8px ${stat.shadowColor}20`,
                          transform: (hoveredCard === index || (isMobile && hoveredCard === index)) 
                            ? (isMobile ? 'rotate(5deg) scale(1.05)' : 'rotate(10deg) scale(1.1)') 
                            : 'rotate(0) scale(1)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <span className={stat.textColor}>
                          {stat.icon}
                        </span>
                      </div>
                    </div>
                    
                    {/* Bottom navigation - Hide on mobile for more space */}
                    {!isMobile && (
                      <div 
                        className="d-flex justify-content-between align-items-center mt-4 pt-4"
                        style={{
                          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                        }}
                      >
                        <span 
                          className="fw-semibold d-flex align-items-center gap-2"
                          style={{
                            fontSize: '14px',
                            color: stat.textColor,
                            letterSpacing: '0.3px',
                            transform: hoveredCard === index ? 'translateX(4px)' : 'translateX(0)',
                            transition: 'transform 0.3s ease',
                          }}
                        >
                          View details
                          <IconChevronRight 
                            size={16} 
                            style={{
                              transition: 'transform 0.3s ease',
                              transform: hoveredCard === index ? 'translateX(4px)' : 'none',
                            }}
                          />
                        </span>
                        
                        {/* Animated circle indicator */}
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: `${stat.textColor}15`,
                            backdropFilter: 'blur(4px)',
                            border: `1px solid ${stat.textColor}30`,
                            transform: hoveredCard === index ? 'scale(1.2)' : 'scale(1)',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <div 
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: stat.textColor,
                              opacity: hoveredCard === index ? 1 : 0.7,
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Hover effect line */}
                    {!isMobile && (
                      <div 
                        className="position-absolute bottom-0 start-0"
                        style={{
                          height: '3px',
                          background: `linear-gradient(90deg, ${stat.textColor}, ${stat.textColor}80)`,
                          borderRadius: '0 0 24px 24px',
                          width: hoveredCard === index ? '100%' : '0%',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    )}
                  </CardBody>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Mobile Refresh Button - OUTSIDE the Container */}
      {isMobile && (
        <Button
          variant="warning"
          size="lg"
          className="rounded-circle shadow-lg d-block d-md-none"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            position: 'fixed',
            bottom: '83px',
            right: '24px',
            width: '40px',
            height: '40px',
            zIndex: 1050,
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {refreshing ? (
            <Spinner 
              animation="border" 
              size="sm"
              style={{ 
                width: '20px', 
                height: '20px',
                borderWidth: '2px'
              }}
            />
          ) : (
            <IconRefresh size={20} />
          )}
        </Button>
      )}

      {/* Add global styles properly */}
      <style jsx global>{`
        /* Responsive design */
        @media (max-width: 768px) {
          .card-lg {
            min-height: 140px !important;
            padding: 1.25rem !important;
          }
          
          /* Ensure cards don't get too small */
          .mobile-card {
            min-height: 130px !important;
          }
        }
        
        @media (max-width: 576px) {
          .card-lg {
            min-height: 120px !important;
            padding: 1rem !important;
            border-radius: 16px !important;
          }
          
          .mobile-card {
            min-height: 120px !important;
          }
        }
        
        /* Better touch targets for mobile */
        @media (max-width: 768px) {
          a {
            -webkit-tap-highlight-color: transparent;
            outline: none;
          }
          
          .card {
            -webkit-tap-highlight-color: transparent;
          }
          
          /* Improve spacing on mobile */
          .g-3 > [class*="col-"] {
            padding-bottom: 12px;
          }
        }

        /* Fix for mobile refresh button */
        @media (max-width: 768px) {
          .fixed-bottom-button {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 9999 !important;
          }
        }

        .rounded-2xl {
          border-radius: 16px;
        }
        
        .w-20 {
          width: 5rem;
        }
        
        .h-20 {
          height: 5rem;
        }
        
        /* Smooth card transitions */
        .card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
      `}</style>
    </>
  );
};

export default DashboardStats;