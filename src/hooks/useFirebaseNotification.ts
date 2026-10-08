"use client";

import { useState, useEffect, useCallback } from "react";
import { getFirebaseMessaging } from "../../lib/firebase/firebase-config";
import { 
  getToken, 
  onMessage, 
  deleteToken, 
  isSupported,
  Messaging 
} from "firebase/messaging";
import { VAPID_KEY } from "../../lib/firebase/firebase-config";

interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  timestamp: Date;
}

interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

interface UseFirebaseNotificationsReturn {
  fcmToken: string | null;
  permission: NotificationPermission | "default";
  currentNotification: NotificationPayload | null;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<string | null>;
  revokePermission: () => Promise<void>;
  clearNotification: () => void;
  shouldShowPrompt: boolean;
  setShowPrompt: (show: boolean) => void;
}

export const useFirebaseNotifications = (userId?: string): UseFirebaseNotificationsReturn => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "default">("default");
  const [currentNotification, setCurrentNotification] = useState<NotificationPayload | null>(null);
  const [isSupportedState, setIsSupportedState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldShowPrompt, setShowPrompt] = useState(false);

  const getDeviceInfo = useCallback((): DeviceInfo => ({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timestamp: new Date(),
  }), []);

  // Check if user has token in database
  const checkTokenInDatabase = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      const response = await fetch(`/api/notification/check-token?userId=${userId}`);
      const data = await response.json();
      return data.success && data.hasToken;
    } catch (err) {
      console.error('Error checking token in database:', err);
      return false;
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkAndSetPrompt = async () => {
        const hasSeenPrompt = localStorage.getItem('notification_prompt_seen');
        const storedToken = localStorage.getItem('fcm_token');
        
        console.log('Initial prompt check:', {
          hasSeenPrompt,
          storedToken: !!storedToken,
          permission: Notification.permission
        });
        
        if (!hasSeenPrompt && Notification.permission === 'default') {
          // Check database first
          if (userId) {
            const hasTokenInDB = await checkTokenInDatabase();
            console.log('Database token check result:', hasTokenInDB);
            
            if (!hasTokenInDB) {
              const timer = setTimeout(() => {
                setShowPrompt(true);
              }, 5000);
              return () => clearTimeout(timer);
            } else {
              // User has token in DB, don't show prompt
              localStorage.setItem('notification_prompt_seen', 'true');
            }
          } else if (!storedToken) {
            // No userId but no stored token either
            const timer = setTimeout(() => {
              setShowPrompt(true);
            }, 5000);
            return () => clearTimeout(timer);
          }
        }
      };
      
      checkAndSetPrompt();
    }
  }, [userId, checkTokenInDatabase]);

  const saveTokenToBackend = useCallback(async (token: string) => {
    if (!userId) return;
    
    try {
      const deviceInfo = getDeviceInfo();
      console.log('📤 Saving token to backend for user:', userId);
      
      const response = await fetch("/api/notification/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          userId, 
          deviceInfo 
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log("✅ Token saved successfully:", result);
        localStorage.setItem("fcm_token", token);
        return result; // Return the response data
      } else {
        console.error("❌ Backend save failed:", result);
        localStorage.setItem("fcm_token", token);
        throw new Error(result.error || 'Failed to save token');
      }
    } catch (err) {
      console.error("❌ Failed to save token to backend", err);
      localStorage.setItem("fcm_token", token);
      throw err;
    }
  }, [userId, getDeviceInfo]);

  const removeTokenFromBackend = useCallback(async (token: string) => {
    if (!userId) return;
    
    try {
      const response = await fetch("/api/notification/token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          userId 
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log("✅ Token removed from backend:", result);
      } else {
        console.error("❌ Failed to remove token from backend:", result);
        throw new Error(result.error || 'Failed to remove token');
      }
    } catch (err) {
      console.error("❌ Failed to remove token from backend", err);
      throw err;
    }
  }, [userId]);

  // Initialize Firebase and check for existing token
  useEffect(() => {
    const init = async () => {
      console.log("🚀 Initializing Firebase notifications...");
      
      try {
        // Check browser support
        const supported = await isSupported();
        console.log("📱 Browser supported?", supported);
        setIsSupportedState(supported);
        
        if (!supported) {
          setError("Push notifications are not supported in your browser");
          return;
        }

        const currentPermission = Notification.permission;
        console.log("🔔 Current permission:", currentPermission);
        setPermission(currentPermission);

        // Check for existing token in localStorage
        const storedToken = localStorage.getItem("fcm_token");
        console.log("🔑 Stored token in localStorage:", storedToken ? "Yes" : "No");
        
        if (storedToken) {
          setFcmToken(storedToken);
          console.log("✅ Using existing token from localStorage");
          
          // Verify token is in database
          if (userId) {
            const hasTokenInDB = await checkTokenInDatabase();
            console.log('Database verification:', hasTokenInDB);
            
            if (!hasTokenInDB) {
              console.log('⚠️ Token in localStorage but not in database, attempting to save...');
              try {
                await saveTokenToBackend(storedToken);
              } catch (err) {
                console.error('Failed to sync token to database:', err);
              }
            }
          }
          
          return;
        }

        // Auto-register ONLY if permission already granted AND no token
        if (currentPermission === "granted" && !storedToken) {
          console.log("🔄 Auto-registering with granted permission...");
          try {
            setIsLoading(true);
            
            const messaging = await getFirebaseMessaging();
            if (!messaging) {
              console.error("❌ Messaging not available");
              return;
            }
            
            console.log("👷 Registering service worker...");
            const registration = await navigator.serviceWorker.register("/sw.js");
            console.log("✅ Service worker registered");
            
            console.log("🔑 Getting FCM token...");
            const token = await getToken(messaging, {
              vapidKey: VAPID_KEY,
              serviceWorkerRegistration: registration,
            });
            
            if (token) {
              console.log("✅ FCM token obtained:", token.substring(0, 20) + "...");
              setFcmToken(token);
              await saveTokenToBackend(token);
            } else {
              console.error("❌ No token generated");
            }
          } catch (err: any) {
            console.error("❌ Failed to auto-generate token:", err.message);
            setError("Failed to setup notifications automatically: " + err.message);
          } finally {
            setIsLoading(false);
            console.log("✅ Auto-registration complete");
          }
        }
      } catch (err: any) {
        console.error("❌ Initialization error:", err.message);
        setError("Initialization failed: " + err.message);
      }
    };

    if (typeof window !== 'undefined') {
      init();
    }
  }, [saveTokenToBackend, userId, checkTokenInDatabase]);

  const requestPermission = useCallback(async (): Promise<string | null> => {
    console.log("🔄 Starting permission request...");
    
    if (!isSupportedState) {
      setError("Notifications not supported");
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we already have a token in localStorage
      const existingToken = localStorage.getItem("fcm_token");
      if (existingToken && Notification.permission === "granted") {
        console.log("✅ Already have token in localStorage");
        
        // Verify it's in database too
        if (userId) {
          const hasTokenInDB = await checkTokenInDatabase();
          if (!hasTokenInDB) {
            console.log("🔄 Token not in database, saving...");
            await saveTokenToBackend(existingToken);
          }
        }
        
        setFcmToken(existingToken);
        return existingToken;
      }

      localStorage.setItem('notification_prompt_seen', 'true');
      
      // 1. Request browser permission
      console.log("1️⃣ Requesting browser notification permission...");
      const perm = await Notification.requestPermission();
      console.log("✅ Permission result:", perm);
      setPermission(perm);
      
      if (perm !== "granted") {
        setError("Permission denied by user");
        return null;
      }

      // 2. Get Firebase messaging
      console.log("2️⃣ Getting Firebase messaging...");
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        setError("Messaging service not available");
        return null;
      }

      // 3. Register service worker
      console.log("3️⃣ Registering service worker...");
      let registration: ServiceWorkerRegistration;
      
      try {
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        console.log(`Found ${existingRegistrations.length} existing service workers`);
        
        if (existingRegistrations.length > 0) {
          registration = existingRegistrations[0];
          console.log("Using existing service worker:", registration.scope);
        } else {
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          console.log("✅ New service worker registered:", registration.scope);
        }
        
        await navigator.serviceWorker.ready;
        console.log("✅ Service worker is ready");
        
      } catch (swError: any) {
        console.error("❌ Service Worker registration failed:", swError);
        throw new Error(`Service Worker failed: ${swError.message}`);
      }

      // 4. Get FCM token
      console.log("4️⃣ Getting FCM token...");
      
      if (!VAPID_KEY || VAPID_KEY.includes('your-actual-vapid-key')) {
        throw new Error("VAPID key is not configured. Please check your Firebase settings.");
      }
      
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      
      if (!token) {
        setError("Failed to generate token");
        return null;
      }

      console.log("✅ FCM token obtained:", token.substring(0, 30) + "...");
      
      // 5. Save token
      console.log("5️⃣ Saving token...");
      setFcmToken(token);
      
      if (userId) {
        try {
          const saveResult = await saveTokenToBackend(token);
          console.log('Token save result:', saveResult);
        } catch (saveErr: any) {
          console.error('Token save failed (will retry later):', saveErr.message);
          // Continue anyway, token is in localStorage
        }
      } else {
        localStorage.setItem("fcm_token", token);
      }
      
      setShowPrompt(false);
      
      console.log("✅ All steps completed successfully!");
      return token;
      
    } catch (err: any) {
      console.error("❌ Permission request failed:", err);
      
      let errorMessage = err.message || "Failed to enable notifications";
      
      if (err.message.includes('messaging/permission-blocked')) {
        errorMessage = "Notifications are blocked in your browser settings.";
      } else if (err.message.includes('messaging/permission-default')) {
        errorMessage = "Notification permission not granted.";
      } else if (err.message.includes('messaging/invalid-vapid-key')) {
        errorMessage = "Invalid VAPID key. Please check Firebase configuration.";
      } else if (err.message.includes('Subscribe failed')) {
        errorMessage = "Push subscription failed. Check service worker and VAPID key.";
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
      console.log("🏁 Permission request flow completed");
    }
  }, [isSupportedState, saveTokenToBackend, userId, checkTokenInDatabase]);

  const revokePermission = useCallback(async () => {
    console.log("🔄 Revoking permission...");
    
    setIsLoading(true);
    try {
      const storedToken = localStorage.getItem("fcm_token");
      
      if (storedToken) {
        console.log("🗑️ Removing token:", storedToken.substring(0, 20) + "...");
        
        if (userId) {
          await removeTokenFromBackend(storedToken);
        }
        
        const messaging = await getFirebaseMessaging();
        if (messaging) {
          await deleteToken(messaging);
          console.log("✅ Token deleted from Firebase");
        }
      }
      
      setFcmToken(null);
      localStorage.removeItem("fcm_token");
      localStorage.removeItem("notification_prompt_seen");
      setPermission("default");
      setShowPrompt(false);
      console.log("✅ Permission revoked");
      
    } catch (err: any) {
      console.error("❌ Failed to revoke permission:", err.message);
      setError("Failed to disable notifications: " + err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [removeTokenFromBackend, userId]);

  const clearNotification = useCallback(() => setCurrentNotification(null), []);

  // Listen for foreground messages
  useEffect(() => {
    const initListener = async () => {
      console.log("👂 Setting up message listener...");
      
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          console.log("❌ Messaging not available for listener");
          return;
        }

        console.log("✅ Setting up onMessage listener");
        return onMessage(messaging, (payload) => {
          console.log("📬 Foreground message received:", payload);
          
          const notification: NotificationPayload = {
            title: payload.notification?.title || "Notification",
            body: payload.notification?.body || "",
            imageUrl: payload.notification?.image,
            data: payload.data,
          };
          
          setCurrentNotification(notification);

          // Trigger refetch across all components listening for this event
          window.dispatchEvent(new CustomEvent('rs-refetch'));
        });
      } catch (err: any) {
        console.error("❌ Failed to setup message listener:", err.message);
      }
    };

    initListener();
  }, []);

  return {
    fcmToken,
    permission,
    currentNotification,
    isSupported: isSupportedState,
    isLoading,
    error,
    requestPermission,
    revokePermission,
    clearNotification,
    shouldShowPrompt,
    setShowPrompt,
  };
};