"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Col,
  Row,
  Form,
  InputGroup,
  Dropdown,
  Modal,
} from "react-bootstrap";
import {
  Plus as IconPlus,
  Search as IconSearch,
  Filter as IconFilter,
  CarFront as IconCar,
} from "react-bootstrap-icons";
import { toast } from "sonner";
import Confetti from "react-confetti";

const CarListHeader = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [drivers, setDrivers] = useState<Array<{ id: number; name: string }>>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Set window size for confetti
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    
    // Fetch drivers for the dropdown
    fetchDrivers();
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await fetch("/api/drivers?limit=100");
      const data = await response.json();
      
      if (data.success && data.data) {
        // Map drivers to simple format: id and name
        const driverOptions = data.data.map((driver: any) => ({
          id: driver.id,
          name: driver.name
        }));
        setDrivers(driverOptions);
      }
    } catch (error) {
      // Silently fail - drivers dropdown is non-critical
    }
  };

  const openModal = () => {
    setFormErrors({});
    setShowModal(true);
  };
  
  const closeModal = () => {
    setFormErrors({});
    setShowModal(false);
  };

  const validateForm = (formData: FormData) => {
    const errors: Record<string, string> = {};
    const registration = formData.get("registration") as string;
    const purchasePrice = formData.get("purchasePrice") as string;
    const currentValue = formData.get("currentValue") as string;
    const purchaseDate = formData.get("purchaseDate") as string;
    const year = formData.get("year") as string;

    // Registration validation
    if (!registration || registration.trim().length === 0) {
      errors.registration = "Registration number is required";
    } else if (registration.length > 20) {
      errors.registration = "Registration cannot exceed 20 characters";
    }

    // Purchase price validation
    if (!purchasePrice || isNaN(parseFloat(purchasePrice)) || parseFloat(purchasePrice) <= 0) {
      errors.purchasePrice = "Valid purchase price is required";
    }

    // Current value validation (optional but must be valid if provided)
    if (currentValue && (isNaN(parseFloat(currentValue)) || parseFloat(currentValue) < 0)) {
      errors.currentValue = "Current value must be a positive number";
    }

    // Purchase date validation (optional but must be valid if provided)
    if (purchaseDate) {
      const date = new Date(purchaseDate);
      if (isNaN(date.getTime())) {
        errors.purchaseDate = "Invalid purchase date";
      } else if (date > new Date()) {
        errors.purchaseDate = "Purchase date cannot be in the future";
      }
    }

    // Year validation (optional but must be valid if provided)
    if (year) {
      const yearNum = parseInt(year);
      const currentYear = new Date().getFullYear();
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
        errors.year = `Year must be between 1900 and ${currentYear + 1}`;
      }
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Validate form
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setLoading(false);
      toast.error("Please fix the errors in the form");
      return;
    }

    const payload = {
      registration: formData.get("registration") as string,
      model: formData.get("model") as string,
      make: formData.get("make") as string,
      year: formData.get("year") ? parseInt(formData.get("year") as string) : null,
      color: formData.get("color") as string,
      purchasePrice: parseFloat(formData.get("purchasePrice") as string),
      purchaseDate: formData.get("purchaseDate") as string || null,
      currentValue: formData.get("currentValue") ? parseFloat(formData.get("currentValue") as string) : null,
      status: formData.get("status") as string,
      isActive: formData.get("isActive") === "true",
      driverProfileId: formData.get("driverProfileId") ? parseInt(formData.get("driverProfileId") as string) : null,
    };

    try {
      const res = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(`Failed to add car: ${data.message || "Unknown error"}`);
        // Play error sound if available
        try {
          const audio = new Audio("/notifications/error.wav");
          audio.play();
        } catch (err) {
          // Silently fail audio
        }
        return;
      }

      form.reset();
      // Play success sound
      try {
        const audio = new Audio("/notifications/success.wav");
        audio.play();
      } catch (err) {
        // Silently fail audio
      }
      
      toast.success(data.message || "Car added successfully");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      closeModal();

      // Dispatch event to refresh car list and statistics
      window.dispatchEvent(new Event('carAdded'));

    } catch (error: any) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get current year for max year validation
  const currentYear = new Date().getFullYear();

  return (
    <>
      {success && isClient && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
        />
      )}
      
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">Cars</h2>
          <p className="text-muted mb-0">Manage your car fleet</p>
        </Col>
        <Col xs="auto">
          <div className="d-flex flex-wrap gap-2 align-items-center">

            
            

          </div>
        </Col>
      </Row>


    </>
  );
};

export default CarListHeader;