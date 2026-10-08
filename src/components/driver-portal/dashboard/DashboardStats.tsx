"use client";

import { JSX, useEffect, useState } from "react";
import { Col, Card, CardBody, Spinner, Button, Row } from "react-bootstrap";
import {
  IconCar,
  IconUserCircle,
  IconContract,
  IconReceipt2,
  IconChevronRight,
  IconRefresh,
  IconHome,
} from "@tabler/icons-react";
import Link from "next/link";

import { toast } from "sonner";
import { useDriverSessionChecker } from "@/hooks/useDriverSessionChecker";

type Stat = {
  title: string;
  value: number | string;
  icon: JSX.Element;
  color: string;
  link: string;
  iconBg: string;
};

const DashboardStats = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const loadStats = async (showRefreshSpinner = false) => {
    try {
      if (showRefreshSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const res = await fetch("/api/dashboard/driver/stats");
      const { data } = await res.json();
        
      const iconSize = isMobile ? 24 : 28;
      
      setStats([
        {
          title: "My Car",
          value: data.totalCars || 0,
          icon: <IconCar size={iconSize} strokeWidth={1.8} />,
          color: "#FF9500",
          link: "/driver-portal/car",
          iconBg: "rgba(255, 149, 0, 0.1)",
        },
        {
          title: "Profile",
          value: "View",
          icon: <IconUserCircle size={iconSize} strokeWidth={1.8} />,
          color: "#007AFF",
          link: "/driver-portal/profile",
          iconBg: "rgba(0, 122, 255, 0.1)",
        },
        {
          title: "Agreements",
          value: data.totalAgreements || 0,
          icon: <IconContract size={iconSize} strokeWidth={1.8} />,
          color: "#34C759",
          link: "/driver-portal/agreements",
          iconBg: "rgba(52, 199, 89, 0.1)",
        },
        {
          title: "Ledger",
          value: "View",
          icon: <IconReceipt2 size={iconSize} strokeWidth={1.8} />,
          color: "#AF52DE",
          link: "/driver-portal/ledger",
          iconBg: "rgba(175, 82, 222, 0.1)",
        },
      ]);
    } catch (error) {
      console.error("Failed to load stats", error);
      const iconSize = isMobile ? 24 : 28;
      
      setStats([
        {
          title: "My Car",
          value: 0,
          icon: <IconCar size={iconSize} strokeWidth={1.8} />,
          color: "#FF9500",
          link: "/driver-portal/car",
          iconBg: "rgba(255, 149, 0, 0.1)",
        },
        {
          title: "Profile",
          value: "View",
          icon: <IconUserCircle size={iconSize} strokeWidth={1.8} />,
          color: "#007AFF",
          link: "/driver-portal/profile",
          iconBg: "rgba(0, 122, 255, 0.1)",
        },
        {
          title: "Agreements",
          value: 0,
          icon: <IconContract size={iconSize} strokeWidth={1.8} />,
          color: "#34C759",
          link: "/driver-portal/agreements",
          iconBg: "rgba(52, 199, 89, 0.1)",
        },
        {
          title: "Ledger",
          value: "View",
          icon: <IconReceipt2 size={iconSize} strokeWidth={1.8} />,
          color: "#AF52DE",
          link: "/driver-portal/ledger",
          iconBg: "rgba(175, 82, 222, 0.1)",
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [isMobile]);

  const handleRefresh = () => {
    loadStats(true);
    toast.info("Refreshing dashboard...");
  };

  // Handle card press for mobile (replaces hover)
  const handleCardPress = (index: number) => {
    if (isMobile) {
      setHoveredCard(hoveredCard === index ? null : index);
    }
  };

  if (loading) {
    return (
      <Col xs={12} className="text-center py-8">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <Spinner 
            animation="border" 
            style={{
              width: '48px',
              height: '48px',
              borderWidth: '3px',
              borderColor: '#FF9500 transparent transparent transparent'
            }}
          />
          <div style={{
            color: '#8E8E93',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Loading your dashboard...
          </div>
        </div>
      </Col>
    );
  }

  return (
    <>
      {/* Main Content */}
      <Col xs={12} className="mb-4">
        <Row className="align-items-center">
          <Col>
            <h2 className="mb-1" style={{ fontSize: isMobile ? '24px' : '28px' }}>
              Driver Dashboard
            </h2>
            <p className="text-muted mb-0" style={{ fontSize: isMobile ? '14px' : '16px' }}>
              Your personalized driver portal
            </p>
          </Col>
          <Col xs="auto">
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {/* Home Button */}
              <Link href="/" className="text-decoration-none">
                <Button
                  variant="outline-primary"
                  className="d-flex align-items-center gap-2"
                  style={{
                    padding: isMobile ? '8px 12px' : '8px 16px',
                    fontSize: isMobile ? '14px' : '16px'
                  }}
                >
                  <IconHome size={isMobile ? 16 : 18} />
                  <span className="d-none d-sm-inline">Home</span>
                </Button>
              </Link>
              
              {/* Refresh Button */}
              <Button
                variant="outline-warning"
                onClick={handleRefresh}
                disabled={refreshing}
                className="d-flex align-items-center gap-2"
                style={{
                  padding: isMobile ? '8px 12px' : '8px 16px',
                  fontSize: isMobile ? '14px' : '16px'
                }}
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
                  <IconRefresh size={isMobile ? 16 : 18} />
                )}
                <span className="d-none d-sm-inline">Refresh</span>
              </Button>
            </div>
          </Col>
        </Row>
      </Col>

      {/* Stats Cards */}
      {stats.map((stat, index) => (
        <Col 
          xl={3} 
          lg={3} 
          md={6} 
          sm={6} 
          xs={12} 
          key={index} 
          className={isMobile ? "mb-3" : "mb-4"}
        >
          <div
            style={{ height: '100%' }}
            onMouseEnter={() => !isMobile && setHoveredCard(index)}
            onMouseLeave={() => !isMobile && setHoveredCard(null)}
            onTouchStart={() => handleCardPress(index)}
          >
            <Link 
              href={stat.link} 
              className="text-decoration-none"
              style={{ 
                display: 'block', 
                height: '100%',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none'
              }}
            >
              <Card 
                className={`border-0 overflow-hidden h-100`}
                style={{
                  minHeight: isMobile ? '130px' : '160px',
                  borderRadius: isMobile ? '20px' : '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: `linear-gradient(135deg, ${stat.iconBg}, rgba(255, 255, 255, 0.1))`,
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: (hoveredCard === index || (isMobile && hoveredCard === index))
                    ? `0 10px 20px ${stat.color}30, 0 4px 8px rgba(0, 0, 0, 0.1)`
                    : '0 4px 12px rgba(0, 0, 0, 0.06)',
                  position: 'relative',
                  transform: (hoveredCard === index || (isMobile && hoveredCard === index)) 
                    ? (isMobile ? 'translateY(-2px) scale(1.01)' : 'translateY(-8px) scale(1.02)') 
                    : 'translateY(0) scale(1)',
                  WebkitTransform: (hoveredCard === index || (isMobile && hoveredCard === index)) 
                    ? (isMobile ? 'translateY(-2px) scale(1.01)' : 'translateY(-8px) scale(1.02)') 
                    : 'translateY(0) scale(1)',
                }}
              >
                {/* Animated background glow */}
                <div 
                  className="position-absolute top-0 start-0 w-100 h-100"
                  style={{
                    background: `radial-gradient(circle at 30% 20%, ${stat.color}15 0%, transparent 70%)`,
                    opacity: (hoveredCard === index || (isMobile && hoveredCard === index)) ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                />
                
                {/* Corner accent */}
                {!isMobile && (
                  <div 
                    className="position-absolute top-0 end-0 w-20 h-20"
                    style={{
                      background: `linear-gradient(135deg, ${stat.color}20 0%, transparent 50%)`,
                      borderBottomLeftRadius: '100%',
                    }}
                  />
                )}
                
                <CardBody style={{
                  padding: isMobile ? '16px' : '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div>
                      <div style={{
                        fontSize: isMobile ? '13px' : '14px',
                        fontWeight: '500',
                        color: '#64748B',
                        letterSpacing: '0.3px',
                        marginBottom: isMobile ? '6px' : '8px'
                      }}>
                        {stat.title}
                      </div>
                      <div style={{
                        fontSize: isMobile ? '28px' : '36px',
                        fontWeight: '700',
                        color: '#0F172A',
                        lineHeight: '1.1',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        minHeight: isMobile ? '34px' : '42px',
                        display: 'flex',
                        alignItems: 'center',
                      }}>
                        {stat.value}
                      </div>
                    </div>
                    
                    {/* Icon with glass effect */}
                    <div 
                      style={{
                        backgroundColor: stat.iconBg,
                        backdropFilter: 'blur(8px)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: isMobile ? '48px' : '64px',
                        height: isMobile ? '48px' : '64px',
                        border: `1px solid ${stat.color}30`,
                        boxShadow: `inset 0 1px 3px rgba(255, 255, 255, 0.3), 0 3px 8px ${stat.color}20`,
                        transform: (hoveredCard === index || (isMobile && hoveredCard === index)) 
                          ? (isMobile ? 'rotate(5deg) scale(1.05)' : 'rotate(10deg) scale(1.1)') 
                          : 'rotate(0) scale(1)',
                        transition: 'all 0.3s ease',
                        WebkitTransform: (hoveredCard === index || (isMobile && hoveredCard === index)) 
                          ? (isMobile ? 'rotate(5deg) scale(1.05)' : 'rotate(10deg) scale(1.1)') 
                          : 'rotate(0) scale(1)',
                      }}
                    >
                      <div style={{ color: stat.color }}>
                        {stat.icon}
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom navigation - Show only on larger screens */}
                  {!isMobile && (
                    <div 
                      className="d-flex justify-content-between align-items-center mt-4 pt-4"
                      style={{
                        borderTop: `1px solid ${stat.color}20`,
                      }}
                    >
                      <span 
                        className="fw-semibold d-flex align-items-center gap-2"
                        style={{
                          fontSize: '14px',
                          color: stat.color,
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
                        style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: stat.iconBg,
                          backdropFilter: 'blur(4px)',
                          border: `1px solid ${stat.color}30`,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: hoveredCard === index ? 'scale(1.2)' : 'scale(1)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <div 
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: stat.color,
                            opacity: hoveredCard === index ? 1 : 0.7,
                            transition: 'all 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Hover effect line - Show only on larger screens */}
                  {!isMobile && (
                    <div 
                      className="position-absolute bottom-0 start-0"
                      style={{
                        height: '3px',
                        background: `linear-gradient(90deg, ${stat.color}, ${stat.color}80)`,
                        borderRadius: '0 0 24px 24px',
                        width: hoveredCard === index ? '100%' : '0%',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  )}
                </CardBody>
              </Card>
            </Link>
          </div>
        </Col>
      ))}
      
      {/* Global styles */}
      <style jsx global>{`
        /* Responsive design */
        @media (max-width: 768px) {
          /* Improve touch targets */
          a, button {
            -webkit-tap-highlight-color: transparent;
            outline: none;
          }
          
          .card {
            min-height: 130px !important;
            border-radius: 20px !important;
          }
          
          /* Better spacing on mobile */
          .mb-4 {
            margin-bottom: 1rem !important;
          }
          
          .mb-3 {
            margin-bottom: 0.75rem !important;
          }
          
          /* Improve button visibility */
          .btn {
            font-size: 14px;
          }
        }
        
        /* Small mobile screens */
        @media (max-width: 576px) {
          .card {
            min-height: 120px !important;
            border-radius: 18px !important;
          }
          
          h2 {
            font-size: 22px !important;
          }
          
          /* Better column spacing */
          [class*="col-"] {
            padding-bottom: 8px;
          }
        }
        
        /* iOS specific fixes */
        @supports (-webkit-touch-callout: none) {
          .card {
            -webkit-backdrop-filter: blur(10px);
            backdrop-filter: blur(10px);
          }
        }
        
        /* Prevent text selection on cards */
        .card * {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        /* Smooth transitions */
        * {
          -webkit-tap-highlight-color: transparent;
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
      `}</style>

      {/* Mobile Refresh Button - Outside the main column structure */}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0'
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
    </>
  );
};

export default DashboardStats;