"use client";

import React, { useState, useEffect } from "react";
import { Dropdown, Button, Modal, Form, Alert, Spinner } from "react-bootstrap";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import zxcvbn from "zxcvbn";

import { UserMenuItem } from "../../../../routes/DriverHeaderRoute";
import { IconLogin2 } from "@tabler/icons-react";
import { Person as IconPerson } from "react-bootstrap-icons";
import NotificationManager from "@/components/NotificationManager";

interface UserToggleProps {
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

const CustomToggle = React.forwardRef<HTMLAnchorElement, UserToggleProps>(
  ({ children, onClick }, ref) => (
    <a
      href="#"
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
    >
      {children}
    </a>
  )
);

CustomToggle.displayName = "CustomToggle";

const UserMenu = () => {
  const { data: session, status } = useSession();
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  // The avatar is intentionally NOT stored in the session/JWT (a base64 avatar there
  // bloats the cookie past the header size limit and breaks login with HTTP 431).
  // Fetch it once from /api/me instead and keep it in local state.
  const [meAvatar, setMeAvatar] = useState<string | null | undefined>(undefined);
  const userAvatar = meAvatar ?? session?.user?.image;
  const userRole = session?.user?.role;
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setMeAvatar(data.avatar ?? null); })
      .catch(() => {});
  }, [userId]);
  
  // Image error state
  const [imageError, setImageError] = useState(false);
  
  // Modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Password strength
  const passwordStrength = zxcvbn(newPassword);
  const strengthScore = passwordStrength.score; // 0-4
  
  // Get strength color and text
  const getStrengthInfo = () => {
    switch(strengthScore) {
      case 0: return { color: "danger", text: "Very Weak" };
      case 1: return { color: "danger", text: "Weak" };
      case 2: return { color: "warning", text: "Fair" };
      case 3: return { color: "info", text: "Good" };
      case 4: return { color: "success", text: "Strong" };
      default: return { color: "secondary", text: "Enter password" };
    }
  };
  
  const strengthInfo = getStrengthInfo();
  
  // Check if passwords don't match (for validation)
  const passwordsDontMatch = Boolean(confirmPassword && newPassword !== confirmPassword);
  
  // Check if form is valid for submit button
  const isFormValid = strengthScore >= 2 && !passwordsDontMatch && currentPassword && newPassword;
  
  // Function to get avatar URL - SAME AS DriverDetail
  const getAvatarUrl = (avatarPath: string | null | undefined) => {
    if (!avatarPath) {
      return null;
    }

    // Mobile-uploaded avatars are stored as base64 data URIs — never rewrite these.
    if (avatarPath.startsWith('data:') || avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    
    // If path starts with /uploads/, convert to API route
    if (avatarPath.startsWith('/uploads/')) {
      // Remove leading slash
      const cleanPath = avatarPath.substring(1);
      return `/api/upload/${cleanPath}`;
    }
    
    // If it's already an API route, return as-is
    if (avatarPath.startsWith('/api/')) {
      return avatarPath;
    }
    
    // For other cases (uploads/filename format)
    if (avatarPath.startsWith('uploads/')) {
      return `/api/upload/${avatarPath}`;
    }
    
    // Default
    return `/api/image/${avatarPath}`;
  };
  
  // Get avatar URL
  const avatarUrl = getAvatarUrl(userAvatar);
  const hasAvatar = userAvatar && !imageError;
  
  // Handle image loading error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    e.currentTarget.style.display = 'none';
  };
  
  // Handle image load success
  const handleImageLoad = () => {
    setImageError(false);
  };
  
  // Handle password change submission
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Frontend validation
    if (!currentPassword) {
      setError("Please enter your current password");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match!");
      return;
    }
    
    // Check password requirements
    const passwordRequirements = [
      { label: "At least 8 characters", test: (pwd: string) => pwd.length >= 8 },
      { label: "At least one uppercase letter", test: (pwd: string) => /[A-Z]/.test(pwd) },
      { label: "At least one lowercase letter", test: (pwd: string) => /[a-z]/.test(pwd) },
      { label: "At least one number", test: (pwd: string) => /\d/.test(pwd) },
      { label: "At least one special character", test: (pwd: string) => /[^A-Za-z0-9]/.test(pwd) },
    ];
    
    const unmetRequirements = passwordRequirements
      .filter(req => !req.test(newPassword))
      .map(req => req.label);
    
    if (unmetRequirements.length > 0) {
      setError(`Password requirements not met: ${unmetRequirements.join(", ")}`);
      return;
    }
    
    if (strengthScore < 2) {
      setError("Please choose a stronger password (at least 'Fair' strength)");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        // Handle API validation errors
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.join(", "));
        }
        throw new Error(data.message || "Failed to update password");
      }
      
      setSuccess(`${data.message} ${data.data?.securityNote || ''}`);
      
      // Reset form after success
      setTimeout(() => {
        setShowPasswordModal(false);
        resetForm();
      }, 2000);
      
    } catch (error: any) {
      console.error("Error updating password:", error);
      
      // User-friendly error messages
      const errorMessage = error.message || "Failed to update password. Please try again.";
      
      // Check for specific error patterns
      if (errorMessage.includes("Current password is incorrect")) {
        setError("The current password you entered is incorrect. Please try again.");
      } else if (errorMessage.includes("Password validation failed")) {
        setError(`Password requirements: ${errorMessage.split(":")[1] || "Please check password requirements"}`);
      } else if (errorMessage.includes("too common")) {
        setError("Please choose a stronger, less common password.");
      } else {
        setError(errorMessage);
      }
      
      // Clear current password field for security
      setCurrentPassword("");
      
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };
  
  // Handle modal close
  const handleModalClose = () => {
    setShowPasswordModal(false);
    resetForm();
  };

  if (status === "loading") {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
        <Spinner animation="border" size="sm" variant="primary" />
      </div>
    );
  }

  return (
    <>
      <Dropdown>
        <Dropdown.Toggle as={CustomToggle}>
          {hasAvatar && avatarUrl ? (
            <div className="position-relative" style={{ width: '40px', height: '40px' }}>
              <img
                src={avatarUrl}
                alt={`${userName}'s profile`}
                className="rounded-circle w-100 h-100"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                  border: '2px solid #0d6efd'
                }}
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            </div>
          ) : (
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{ 
                width: '40px', 
                height: '40px',
                backgroundColor: '#f8f9fa',
                border: '2px solid #0d6efd'
              }}
            >
              <IconPerson size={20} className="text-secondary" />
            </div>
          )}
        </Dropdown.Toggle>

        <Dropdown.Menu align="end" className="p-0 dropdown-menu-md">
          {/* User info with profile picture */}
          <div className="d-flex gap-3 align-items-center border-dashed border-bottom px-4 py-4">
            {hasAvatar && avatarUrl ? (
              <div 
                className="rounded-circle position-relative"
                style={{ 
                  width: '60px', 
                  height: '60px',
                  flexShrink: 0,
                  border: '3px solid #0d6efd',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={avatarUrl}
                  alt={`${userName}'s profile photo`}
                  className="w-100 h-100"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
              </div>
            ) : (
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ 
                  width: '60px', 
                  height: '60px',
                  backgroundColor: '#f8f9fa',
                  border: '3px solid #0d6efd',
                  flexShrink: 0
                }}
              >
                <IconPerson size={30} className="text-secondary" />
              </div>
            )}
            <div>
              <h4 className="mb-0 fs-5">{userName}</h4>
              <p className="mb-0 text-secondary small">{userEmail}</p>
              {userRole && (
                <span className="badge bg-info mt-1">{userRole}</span>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div className="p-3 d-flex flex-column gap-1">
            {UserMenuItem.map((item) => (
              item.link === "#" ? (
                <button
                  key={item.id}
                  className="dropdown-item d-flex align-items-center gap-2 text-decoration-none bg-transparent border-0 w-100 text-start"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <span>{item.icon}</span>
                  <span>{item.title}</span>
                </button>
              ) : (
                <Link
                  key={item.id}
                  href={item.link}
                  className="dropdown-item d-flex align-items-center gap-2 text-decoration-none"
                >
                  <span>{item.icon}</span>
                  <span>{item.title}</span>
                </Link>
              )
            ))}
          </div>

          {/* Notification Manager Integration */}
          {userId && (
            <div className="border-dashed border-top border-bottom">
              <NotificationManager
                userId={userId}
                showStatus={false} // We don't want the floating button
                dropdownMode={true} // This enables the dropdown version
              />
            </div>
          )}

          {/* Logout */}
          <div className="border-dashed border-top mb-4 pt-4 px-6">
            <Button
              variant="link"
              className="text-secondary d-flex align-items-center gap-2 p-0"
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
            >
              <IconLogin2 size={20} strokeWidth={1.5} />
              Logout
            </Button>
          </div>
        </Dropdown.Menu>
      </Dropdown>

      {/* Password Change Modal */}
      <Modal show={showPasswordModal} onHide={handleModalClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePasswordChange}>
          <Modal.Body>
            {error && (
              <Alert variant="danger" onClose={() => setError("")} dismissible>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert variant="success">
                {success}
              </Alert>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                disabled={isLoading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={isLoading}
              />
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small>Password Strength:</small>
                    <small className={`text-${strengthInfo.color} fw-bold`}>
                      {strengthInfo.text}
                    </small>
                  </div>
                  <div className="progress" style={{ height: "5px" }}>
                    <div
                      className={`progress-bar bg-${strengthInfo.color}`}
                      role="progressbar"
                      style={{ width: `${(strengthScore + 1) * 25}%` }}
                    />
                  </div>
                  <small className="text-muted d-block mt-2">
                    Password requirements:
                  </small>
                  <ul className="text-muted small mb-0">
                    <li className={newPassword.length >= 8 ? "text-success" : ""}>
                      At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(newPassword) ? "text-success" : ""}>
                      At least one uppercase letter
                    </li>
                    <li className={/[a-z]/.test(newPassword) ? "text-success" : ""}>
                      At least one lowercase letter
                    </li>
                    <li className={/\d/.test(newPassword) ? "text-success" : ""}>
                      At least one number
                    </li>
                    <li className={/[^A-Za-z0-9]/.test(newPassword) ? "text-success" : ""}>
                      At least one special character
                    </li>
                  </ul>
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={isLoading}
                isInvalid={passwordsDontMatch}
              />
              {passwordsDontMatch && (
                <Form.Control.Feedback type="invalid">
                  Passwords do not match
                </Form.Control.Feedback>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={handleModalClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default UserMenu;