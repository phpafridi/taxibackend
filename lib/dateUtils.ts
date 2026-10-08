/**
 * Utility functions for date calculations and formatting
 */

/**
 * Formats a date string to a localized date format
 * @param dateString - ISO date string or null
 * @returns Formatted date string or "N/A" if null
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    
    return date.toLocaleDateString("en-GB", {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

/**
 * Formats a date string to include time
 * @param dateString - ISO date string or null
 * @returns Formatted date with time or "N/A" if null
 */
export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    
    return date.toLocaleDateString("en-GB", {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Error formatting date time:", error);
    return "Invalid date";
  }
};

/**
 * Calculates days remaining until expiry
 * @param expiryDate - ISO date string or null
 * @returns Human-readable string describing days remaining/expired status
 */
export const calculateDaysRemaining = (expiryDate: string | null): string => {
  if (!expiryDate) return "N/A";
  
  try {
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return "Invalid date";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const timeDiff = expiry.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff < 0) {
      return `Expired ${Math.abs(daysDiff)} days ago`;
    } else if (daysDiff === 0) {
      return "Expires today";
    } else if (daysDiff === 1) {
      return "Expires tomorrow";
    } else {
      return `${daysDiff} days remaining`;
    }
  } catch (error) {
    console.error("Error calculating days remaining:", error);
    return "Invalid date";
  }
};

/**
 * Gets the badge color based on expiry status
 * @param expiryDate - ISO date string or null
 * @returns Bootstrap badge color variant
 */
export const getExpiryBadgeColor = (expiryDate: string | null): "success" | "warning" | "danger" | "secondary" => {
  if (!expiryDate) return "secondary";
  
  try {
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return "secondary";
    
    const today = new Date();
    
    if (expiry < today) {
      return "danger"; // Expired
    }
    
    // 30 days warning threshold
    const warningThreshold = new Date();
    warningThreshold.setDate(warningThreshold.getDate() + 30);
    
    if (expiry <= warningThreshold) {
      return "warning"; // Expiring soon (within 30 days)
    }
    
    return "success"; // More than 30 days remaining
  } catch (error) {
    console.error("Error getting expiry badge color:", error);
    return "secondary";
  }
};

/**
 * Checks if a date is expired
 * @param dateString - ISO date string or null
 * @returns Boolean indicating if date is expired
 */
export const isDateExpired = (dateString: string | null): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    return date < new Date();
  } catch (error) {
    console.error("Error checking if date expired:", error);
    return false;
  }
};

/**
 * Checks if a date is expiring soon (within specified days)
 * @param dateString - ISO date string or null
 * @param daysThreshold - Number of days to consider as "soon" (default: 30)
 * @returns Boolean indicating if date is expiring soon
 */
export const isDateExpiringSoon = (dateString: string | null, daysThreshold: number = 30): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    return date >= today && date <= thresholdDate;
  } catch (error) {
    console.error("Error checking if date expiring soon:", error);
    return false;
  }
};

/**
 * Formats a date to a simple YYYY-MM-DD string
 * @param dateString - ISO date string or null
 * @returns YYYY-MM-DD format or empty string
 */
export const formatDateSimple = (dateString: string | null): string => {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error formatting date simple:", error);
    return "";
  }
};

/**
 * Adds days to a date
 * @param dateString - ISO date string or null
 * @param days - Number of days to add (can be negative)
 * @returns New date or null if input is invalid
 */
export const addDays = (dateString: string | null, days: number): Date | null => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    date.setDate(date.getDate() + days);
    return date;
  } catch (error) {
    console.error("Error adding days to date:", error);
    return null;
  }
};

/**
 * Calculates the difference in days between two dates
 * @param date1 - First ISO date string or null
 * @param date2 - Second ISO date string or null
 * @returns Number of days difference (positive if date2 > date1)
 */
export const getDaysDifference = (date1: string | null, date2: string | null): number | null => {
  if (!date1 || !date2) return null;
  
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    
    const timeDiff = d2.getTime() - d1.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  } catch (error) {
    console.error("Error calculating days difference:", error);
    return null;
  }
};

/**
 * Gets the current date in YYYY-MM-DD format
 */
export const getCurrentDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Gets the current date and time in ISO format
 */
export const getCurrentDateTimeISO = (): string => {
  return new Date().toISOString();
};