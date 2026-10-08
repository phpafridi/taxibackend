"use client";

import React, { useState, useRef, useEffect } from "react";
import { Dropdown, Button, Modal, Form, Alert, Spinner } from "react-bootstrap";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import zxcvbn from "zxcvbn";

import { UserMenuItem } from "../../../routes/HeaderRoute";
import { IconLogin2 } from "@tabler/icons-react";
import {
  Person as IconPerson,
  Camera as IconCamera,
  X as IconX,
  Pencil as IconEdit,
  Envelope as IconEmail,
  Crop as IconCrop,
  Check as IconCheck
} from "react-bootstrap-icons";
import { toast } from "sonner";
import NotificationManager from "@/components/NotificationManager";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

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
  const { data: session, status, update } = useSession();
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

  // Avatar edit states with cropper
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [removeExistingAvatar, setRemoveExistingAvatar] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<any>(null);

  // Profile edit states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail);

  // Password strength
  const passwordStrength = zxcvbn(newPassword);
  const strengthScore = passwordStrength.score; // 0-4

  // Get strength color and text
  const getStrengthInfo = () => {
    switch (strengthScore) {
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

  // Function to get avatar URL
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

  // Handle avatar file selection
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setCroppedImageFile(file);
    setRemoveExistingAvatar(false);
    
    // Create preview URL for cropping
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setOriginalImage(imageUrl);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  // Trigger file input click
  const handleAvatarClick = () => {
    avatarFileInputRef.current?.click();
  };

  // Remove selected image
  const handleRemoveAvatar = () => {
    setCroppedImageFile(null);
    setCroppedImage(null);
    setAvatarPreview(null);
    setOriginalImage(null);
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }

    // If there was an existing avatar, mark it for removal
    if (userAvatar) {
      setRemoveExistingAvatar(true);
    }
  };

  // Crop image function
  const getCroppedImage = () => {
    if (cropperRef.current && cropperRef.current.cropper) {
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
      if (croppedCanvas) {
        const croppedImageUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
        setCroppedImage(croppedImageUrl);
        setAvatarPreview(croppedImageUrl);
        setShowCropModal(false);
        toast.success("Image cropped successfully");
      }
    }
  };

  // Cancel crop and use original image
  const cancelCrop = () => {
    if (originalImage) {
      setAvatarPreview(originalImage);
    }
    setShowCropModal(false);
    toast.info("Using original image");
  };

  // Upload avatar image to API - USES drivers FOLDER
  const uploadAvatarImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'drivers');

      // Pass old avatar path for deletion if exists
      if (userAvatar && userAvatar.startsWith('/uploads/drivers/')) {
        formData.append('oldAvatar', userAvatar);
      }

      const response = await fetch('/api/upload/car-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }

      return data.url;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  // Delete image without uploading new one
  const deleteAvatarImage = async (imagePath: string): Promise<void> => {
    try {
      const response = await fetch('/api/upload/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: imagePath }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  };

  // Update user profile with new avatar - USE update-profile endpoint
  const updateUserAvatar = async (avatarUrl: string | null): Promise<void> => {
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar: avatarUrl,
          email: userEmail,
          userId: userId,
          currentEmail: userEmail,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Avatar update - Non-JSON response:', text.substring(0, 200));

        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('API endpoint /api/user/update-profile not found. Check your routes.');
        }

        throw new Error(`Server returned: ${text.substring(0, 100)}...`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update avatar');
      }

      // Update local avatar state (NOT the session/JWT — pushing a base64 avatar
      // back into the session here is exactly what caused the HTTP 431 login bug).
      setMeAvatar(avatarUrl);

      return data;
    } catch (error) {
      console.error('Error updating user avatar:', error);
      throw error;
    }
  };

  // Update user name and email - USE update-profile endpoint
  const updateUserProfile = async (name: string, email: string): Promise<void> => {
    try {

      const response = await fetch('/api/user/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          userId: userId,
          currentEmail: userEmail,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Profile update - Non-JSON response:', text.substring(0, 200));

        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('API endpoint /api/user/update-profile not found. Check your routes.');
        }

        throw new Error(`Server returned: ${text.substring(0, 100)}...`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: name,
          email: email,
        }
      });

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  // Handle avatar update submission
  const handleAvatarUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvatarUploading(true);

    try {
      let newAvatarUrl = null;

      // Handle cropped image upload
      if (croppedImage && croppedImageFile) {
        // Convert data URL to blob
        const response = await fetch(croppedImage);
        const blob = await response.blob();
        const fileToUpload = new File([blob], croppedImageFile.name, { type: 'image/jpeg' });
        
        newAvatarUrl = await uploadAvatarImage(fileToUpload);
      } else if (removeExistingAvatar && userAvatar) {
        // Delete existing avatar without uploading new one
        await deleteAvatarImage(userAvatar);
        newAvatarUrl = null;
      }

      // Update user profile with new avatar URL
      await updateUserAvatar(newAvatarUrl);

      toast.success('Profile picture updated successfully');
      setShowAvatarModal(false);

      // Reset states
      setCroppedImageFile(null);
      setCroppedImage(null);
      setAvatarPreview(null);
      setOriginalImage(null);
      setRemoveExistingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }

      // Refresh the page to show new avatar
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (error: any) {
      console.error('Error updating avatar:', error);
      toast.error(error.message || 'Failed to update profile picture');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Handle profile update submission
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      // Validate email
      if (!editEmail.includes('@') || !editEmail.includes('.')) {
        throw new Error('Please enter a valid email address');
      }

      // Validate name
      if (!editName.trim()) {
        throw new Error('Please enter your name');
      }

      // Update profile
      await updateUserProfile(editName, editEmail);

      setProfileSuccess('Profile updated successfully');
      toast.success('Profile updated successfully');

      setTimeout(() => {
        setShowProfileModal(false);
        // Refresh the page to show updated name/email
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      setProfileError(error.message || 'Failed to update profile');
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

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
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(data.errors.join(", "));
        }
        throw new Error(data.message || "Failed to update password");
      }

      setSuccess(`${data.message} ${data.data?.securityNote || ''}`);

      setTimeout(() => {
        setShowPasswordModal(false);
        resetForm();
      }, 2000);

    } catch (error: any) {
      console.error("Error updating password:", error);

      const errorMessage = error.message || "Failed to update password. Please try again.";

      if (errorMessage.includes("Current password is incorrect")) {
        setError("The current password you entered is incorrect. Please try again.");
      } else if (errorMessage.includes("Password validation failed")) {
        setError(`Password requirements: ${errorMessage.split(":")[1] || "Please check password requirements"}`);
      } else if (errorMessage.includes("too common")) {
        setError("Please choose a stronger, less common password.");
      } else {
        setError(errorMessage);
      }

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
  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    resetForm();
  };

  // Handle avatar modal close
  const handleAvatarModalClose = () => {
    setShowAvatarModal(false);
    setCroppedImageFile(null);
    setCroppedImage(null);
    setAvatarPreview(null);
    setOriginalImage(null);
    setRemoveExistingAvatar(false);
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  // Handle profile modal close
  const handleProfileModalClose = () => {
    setShowProfileModal(false);
    setEditName(userName);
    setEditEmail(userEmail);
    setProfileError("");
    setProfileSuccess("");
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
              className="rounded-circle d-flex align-items-center justify-content-center position-relative"
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
          <div className="d-flex gap-3 align-items-center border-dashed border-bottom px-4 py-4">
            <div className="position-relative cursor-pointer" onClick={() => setShowAvatarModal(true)}>
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
                  className="rounded-circle d-flex align-items-center justify-content-center position-relative"
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
            </div>
            <div>
              <h4 className="mb-0 fs-5">{userName}</h4>
              <p className="mb-0 text-secondary small">{userEmail}</p>
              {userRole && (
                <span className="badge bg-info mt-1">{userRole}</span>
              )}
            </div>
          </div>

          <div className="p-3 d-flex flex-column gap-1">
            <button
              className="dropdown-item d-flex align-items-center gap-2 text-decoration-none bg-transparent border-0 w-100 text-start"
              onClick={() => setShowProfileModal(true)}
            >
              <IconEdit size={16} />
              <span>Edit Profile</span>
            </button>

            <button
              className="dropdown-item d-flex align-items-center gap-2 text-decoration-none bg-transparent border-0 w-100 text-start"
              onClick={() => setShowAvatarModal(true)}
            >
              <IconCamera size={16} />
              <span>Change Profile Picture</span>
            </button>

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
          {userId && (
            <NotificationManager
              userId={userId}
              showStatus={false} // We don't want the floating button
              dropdownMode={true} // This enables the dropdown version
            />
          )}

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
      <Modal show={showPasswordModal} onHide={handlePasswordModalClose} centered>
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
              onClick={handlePasswordModalClose}
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

      {/* Profile Picture Edit Modal */}
      <Modal show={showAvatarModal} onHide={handleAvatarModalClose} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Update Profile Picture</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAvatarUpdate}>
          <Modal.Body>
            <div className="text-center mb-4">
              <div className="position-relative mx-auto" style={{ width: '200px', height: '200px' }}>
                <div
                  className="rounded-circle position-relative mx-auto cursor-pointer"
                  style={{
                    width: '200px',
                    height: '200px',
                    border: '4px solid #0d6efd',
                    backgroundColor: '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                  onClick={handleAvatarClick}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-100 h-100"
                      style={{
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                    />
                  ) : userAvatar && !removeExistingAvatar ? (
                    <img
                      src={getAvatarUrl(userAvatar) || ''}
                      alt={`${userName}'s profile`}
                      className="w-100 h-100"
                      style={{
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                    />
                  ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100">
                      <IconCamera size={50} className="text-secondary mb-2" />
                      <span className="text-muted small">Click to upload</span>
                    </div>
                  )}

                  {/* Crop and Remove buttons */}
                  {(avatarPreview || (userAvatar && !removeExistingAvatar)) && (
                    <div className="position-absolute top-0 end-0 m-2 d-flex flex-column gap-1">
                      {originalImage && (
                        <Button
                          variant="info"
                          size="sm"
                          className="rounded-circle"
                          style={{ width: '30px', height: '30px', padding: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (originalImage) {
                              setShowCropModal(true);
                            }
                          }}
                          title="Crop Image"
                        >
                          <IconCrop size={14} />
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        className="rounded-circle"
                        style={{ width: '30px', height: '30px', padding: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAvatar();
                        }}
                        title="Remove Image"
                      >
                        <IconX size={14} />
                      </Button>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={avatarFileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="d-none"
                />
              </div>

              <div className="text-muted small mt-3">
                Click the image to upload new photo (max 5MB, JPG/PNG/WebP)
              </div>

              {userAvatar && !removeExistingAvatar && !avatarPreview && (
                <div className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={removeExistingAvatar}
                    onChange={(e) => setRemoveExistingAvatar(e.target.checked)}
                    id="removeAvatar"
                  />
                  <label className="form-check-label small" htmlFor="removeAvatar">
                    Remove current profile picture
                  </label>
                </div>
              )}
            </div>

            <Alert variant="info" className="small">
              <strong>Note:</strong> When uploading a new picture, the old one will be automatically deleted from the server.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={handleAvatarModalClose}
              disabled={avatarUploading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={avatarUploading || (!croppedImageFile && !removeExistingAvatar)}
            >
              {avatarUploading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating...
                </>
              ) : (
                'Update Picture'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* CROP IMAGE MODAL */}
      <Modal show={showCropModal} onHide={cancelCrop} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <IconCrop className="me-2" />
            Crop Profile Picture
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {originalImage && (
            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
              <Cropper
                src={originalImage}
                style={{ height: '400px', width: '100%' }}
                initialAspectRatio={1} // Square aspect ratio for profile photos
                guides={true}
                ref={cropperRef}
                viewMode={1}
                minCropBoxHeight={100}
                minCropBoxWidth={100}
                background={false}
                responsive={true}
                autoCropArea={1}
                checkOrientation={false}
                cropBoxMovable={true}
                cropBoxResizable={true}
                toggleDragModeOnDblclick={true}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelCrop}>
            Cancel
          </Button>
          <Button variant="primary" onClick={getCroppedImage}>
            <IconCheck className="me-2" />
            Apply Crop
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Profile Edit Modal */}
      <Modal show={showProfileModal} onHide={handleProfileModalClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleProfileUpdate}>
          <Modal.Body>
            {profileError && (
              <Alert variant="danger" onClose={() => setProfileError("")} dismissible>
                {profileError}
              </Alert>
            )}

            {profileSuccess && (
              <Alert variant="success">
                {profileSuccess}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={profileLoading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={profileLoading}
              />
              <Form.Text className="text-muted">
                You will need to verify your email address if you change it.
              </Form.Text>
            </Form.Group>

            <Alert variant="warning" className="small">
              <strong>Important:</strong> Changing your email may require you to verify the new address and sign in again.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={handleProfileModalClose}
              disabled={profileLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={profileLoading || (!editName.trim() || !editEmail.includes('@'))}
            >
              {profileLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default UserMenu;