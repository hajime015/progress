/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Menu, Loader2, RefreshCw } from "lucide-react";

// Types & Defaults
import { Guest, TableConfig, RsvpStatus, EntryType } from "./types";
import { initialGuests, initialTables, initialStaff } from "./data/mockData";

// Specialized Views & Overlays
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import ReservationsView from "./components/ReservationsView";
import TableMapView from "./components/TableMapView";
import EntryModal from "./components/EntryModal";
import StaffManagerModal from "./components/StaffManagerModal";
import SyncConfigPanel from "./components/SyncConfigPanel";
import LoginScreen from "./components/LoginScreen";

// Timezone Utilities
import {
  getDetectedTimezone,
  getSystemTime24InTimezone,
  POPULAR_TIMEZONES
} from "./utils/timezone";

export default function App() {
  const [loggedUsername, setLoggedUsername] = useState<string | null>(() => {
    return localStorage.getItem("guest_rsvp_mngr_active_username");
  });

  // Dynamic LocalStorage key generator per independent Gmail account to guarantee isolate sandbox state
  const getAccountKey = (keyName: string) => {
    if (!loggedUsername) return `guest_rsvp_mngr_${keyName}`;
    const safeUser = loggedUsername.toLowerCase().trim().replace(/[@.]/g, "_");
    return `guest_rsvp_mngr_${safeUser}_${keyName}`;
  };

  const handleLoginSuccess = (username: string) => {
    const cleanEmail = username.trim().toLowerCase();
    setLoggedUsername(cleanEmail);
    localStorage.setItem("guest_rsvp_mngr_active_username", cleanEmail);
  };

  const handleLogout = () => {
    setLoggedUsername(null);
    localStorage.removeItem("guest_rsvp_mngr_active_username");
    showToast("🔓 Logged out of your session successfully");
  };

  // Navigation Tabs state: "dashboard" | "reservations" | "tablemap"
  const [activeTab, setActiveTab] = useState<"dashboard" | "reservations" | "tablemap">("dashboard");

  // Restaurant Custom Brand Configuration
  const [restaurantName, setRestaurantName] = useState("Guest Manager");
  const [restaurantPhoto, setRestaurantPhoto] = useState<string | null>(null);

  const handleSaveRestaurantName = (name: string) => {
    setRestaurantName(name);
    localStorage.setItem(getAccountKey("restaurant_name"), name);
    showToast(`🏨 Restaurant updated to: ${name}`);
  };

  const handleSaveRestaurantPhoto = (photo: string | null) => {
    setRestaurantPhoto(photo);
    if (photo) {
      localStorage.setItem(getAccountKey("restaurant_photo"), photo);
      showToast(`📸 Restaurant photo updated successfully`);
    } else {
      localStorage.removeItem(getAccountKey("restaurant_photo"));
      showToast(`🗑️ Restaurant logo reset to default`);
    }
  };

  // Timezone & real-time clock state control
  const [timezone, setTimezone] = useState("AUTO");
  const [currentTime, setCurrentTime] = useState("");

  const activeTz = timezone === "AUTO" ? getDetectedTimezone() : timezone;

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(getSystemTime24InTimezone(activeTz));
    };
    updateTime(); // run immediately
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeTz]);

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem(getAccountKey("timezone"), tz);
    showToast(`App timezone switched to: ${tz === "AUTO" ? getDetectedTimezone() : tz}`);
  };

  // Mobile navigation drawer toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core Database States
  const [guests, setRawGuests] = useState<Guest[]>([]);
  const setGuests = React.useCallback((value: Guest[] | ((prev: Guest[]) => Guest[])) => {
    setRawGuests(prev => {
      const resolved = typeof value === "function" ? value(prev) : value;
      return resolved.map(g => {
        let cleanDate = g.date || "";
        if (cleanDate && (cleanDate.includes("T") || cleanDate.includes("Z"))) {
          try {
            const d = new Date(cleanDate);
            if (!isNaN(d.getTime())) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              cleanDate = `${year}-${month}-${day}`;
            } else {
              cleanDate = cleanDate.split("T")[0];
            }
          } catch (e) {
            cleanDate = cleanDate.split("T")[0];
          }
        }
        return { ...g, date: cleanDate };
      });
    });
  }, []);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [staffList, setStaffList] = useState<string[]>([]);
  const [scriptUrl, setScriptUrl] = useState("");

  // Storage and autosave preference states
  const [storageMode, setStorageMode] = useState<"local" | "google_sync">("local");
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Modals state control
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryModalInitialType, setEntryModalInitialType] = useState<"Reservation" | "Walk-In">("Reservation");
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
  
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Global background sync loader
  const [isSyncing, setIsSyncing] = useState(false);

  // Elite Toast alerting system
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3500);
  };

  // Local sync method to Apps Script Web App
  const callAppsScriptAPI = async (action: string, payload: any = {}) => {
    if (!scriptUrl) return null;
    try {
      setIsSyncing(true);
      const response = await fetch(scriptUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify({ action, ...payload })
      });
      if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Execution unsuccessful");
      return result;
    } catch (err: any) {
      console.error("Sheets Sync Error: ", err);
      let errMsg = err.message || "Connection rejected";
      if (errMsg.toLowerCase().includes("failed to fetch") || errMsg.toLowerCase().includes("typeerror")) {
        errMsg = "Google Web App unreachable. Ensure your Apps Script URL is correct and deployed with access: 'Anyone'.";
      }
      showToast(`⚠️ Sync notice: ${errMsg}`);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  // SEED AND INITIALIZE DATASETS PER LOGGED GMAIL ACCOUNT
  useEffect(() => {
    if (!loggedUsername) return;

    const cachedGuests = localStorage.getItem(getAccountKey("guests"));
    const cachedTables = localStorage.getItem(getAccountKey("tables"));
    const cachedStaff = localStorage.getItem(getAccountKey("staff"));
    const cachedUrl = localStorage.getItem(getAccountKey("script_url"));
    const cachedName = localStorage.getItem(getAccountKey("restaurant_name"));
    const cachedPhoto = localStorage.getItem(getAccountKey("restaurant_photo"));
    const cachedTz = localStorage.getItem(getAccountKey("timezone"));

    let loadedGuests = initialGuests;
    let loadedTables = initialTables;
    let loadedStaff = initialStaff;

    if (cachedGuests) {
      try {
        loadedGuests = JSON.parse(cachedGuests);
      } catch (e) {
        loadedGuests = initialGuests;
      }
    } else {
      localStorage.setItem(getAccountKey("guests"), JSON.stringify(initialGuests));
    }

    if (cachedTables) {
      try {
        const parsed = JSON.parse(cachedTables);
        loadedTables = parsed.map((t: TableConfig) => {
          let newIcon = t.icon;
          if (!["🔥", "💧", "🍹"].includes(t.icon)) {
            if (t.icon === "🍹" || t.icon === "🍸" || t.icon === "🍷" || t.icon === "🍺" || t.icon === "🚪") {
              newIcon = "🍹";
            } else if (t.icon === "🪑") {
              newIcon = "🔥";
            } else {
              newIcon = "💧";
            }
          }
          return { ...t, icon: newIcon };
        });
      } catch (e) {
        loadedTables = initialTables;
      }
    } else {
      localStorage.setItem(getAccountKey("tables"), JSON.stringify(initialTables));
    }

    if (cachedStaff) {
      try {
        loadedStaff = JSON.parse(cachedStaff);
      } catch (e) {
        loadedStaff = initialStaff;
      }
    } else {
      localStorage.setItem(getAccountKey("staff"), JSON.stringify(initialStaff));
    }

    // Set states
    setGuests(loadedGuests);
    setTables(loadedTables);
    setStaffList(loadedStaff);

    // Sheets script URL
    const targetUrl = cachedUrl || "https://script.google.com/macros/s/AKfycby6xlQM9iYa5qOSkxeDrLSG6vkrZbTCz03tacSZyV_7hHwQJr4b5arT9Yo8skIk0Eemog/exec";
    setScriptUrl(targetUrl);
    if (!cachedUrl) {
      localStorage.setItem(getAccountKey("script_url"), targetUrl);
    }

    // Brand Name & Photo
    setRestaurantName(cachedName || "Guest Manager");
    if (!cachedName) {
      localStorage.setItem(getAccountKey("restaurant_name"), "Guest Manager");
    }
    setRestaurantPhoto(cachedPhoto || null);

    // Timezone
    if (cachedTz) {
      setTimezone(cachedTz);
    } else {
      setTimezone("AUTO");
      localStorage.setItem(getAccountKey("timezone"), "AUTO");
    }

    // Load saving preferences
    const cachedStorageMode = localStorage.getItem(getAccountKey("storage_mode"));
    const cachedAutoSave = localStorage.getItem(getAccountKey("auto_save"));

    let activeStorageMode: "local" | "google_sync" = "local";
    if (cachedStorageMode) {
      activeStorageMode = cachedStorageMode as "local" | "google_sync";
      setStorageMode(activeStorageMode);
    } else {
      const defaultMode = cachedUrl ? "google_sync" : "local";
      activeStorageMode = defaultMode;
      setStorageMode(defaultMode);
      localStorage.setItem(getAccountKey("storage_mode"), defaultMode);
    }

    if (cachedAutoSave !== null) {
      setAutoSave(cachedAutoSave === "true");
    } else {
      setAutoSave(true);
      localStorage.setItem(getAccountKey("auto_save"), "true");
    }

    // Execute background remote sync pull immediately only if in google_sync mode
    if (activeStorageMode === "google_sync") {
      setTimeout(() => {
        executePullFromSheet(targetUrl, true);
      }, 500);
    }
  }, [loggedUsername]);

  // Sync / pull data helper from sheet URL
  const executePullFromSheet = async (targetUrl: string, silent = false) => {
    if (!targetUrl || !loggedUsername) return;
    try {
      if (!silent) setIsSyncing(true);
      const res = await fetch(targetUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "getAll" })
      });
      if (!res.ok) throw new Error("HTTP connection failed");
      const data = await res.json();
      if (data.success) {
        // Save reservations if any exist on the remote sheet
        if (data.reservations && data.reservations.length > 0) {
          setGuests(data.reservations);
          localStorage.setItem(getAccountKey("guests"), JSON.stringify(data.reservations));
        }
        // Save tables configurations if matching remote list
        if (data.tables && data.tables.length > 0) {
          setTables(data.tables);
          localStorage.setItem(getAccountKey("tables"), JSON.stringify(data.tables));
        }
        // Save crew roster
        if (data.staff && data.staff.length > 0) {
          setStaffList(data.staff);
          localStorage.setItem(getAccountKey("staff"), JSON.stringify(data.staff));
        }
        if (!silent) {
          showToast("🔄 Google Sheets synchronized successfully!");
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote startup data. Using offline storage.", e);
      if (!silent) {
        showToast("⚠️ Sync notice: Spreadsheet offline or unreachable.");
      }
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // Background Auto-Sync loop for active cross-platform updates
  useEffect(() => {
    if (!scriptUrl || storageMode !== "google_sync") return;
    const interval = setInterval(() => {
      // Quiet background pull to refresh data silently
      executePullFromSheet(scriptUrl, true);
    }, 5000); // 5 seconds auto-interval
    return () => clearInterval(interval);
  }, [scriptUrl, loggedUsername, storageMode]);

  // Local storage broadcast listener for instantaneous multi-tab sync on same machine
  useEffect(() => {
    const syncLocalTabs = (e: StorageEvent) => {
      if (!loggedUsername) return;
      if (e.key === getAccountKey("guests") && e.newValue) {
        try { setGuests(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      } else if (e.key === getAccountKey("tables") && e.newValue) {
        try { setTables(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      } else if (e.key === getAccountKey("staff") && e.newValue) {
        try { setStaffList(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
    };
    window.addEventListener("storage", syncLocalTabs);
    return () => window.removeEventListener("storage", syncLocalTabs);
  }, [loggedUsername]);

  // 1. ADD / UPDATE BOOKING ACTION
  const handleSaveGuest = async (savedGuest: Guest) => {
    const exists = guests.some(g => g.id === savedGuest.id);
    let updatedList: Guest[];
    if (exists) {
      updatedList = guests.map(g => (g.id === savedGuest.id ? savedGuest : g));
      showToast(`✏️ ${savedGuest.name}'s details updated`);
    } else {
      updatedList = [savedGuest, ...guests];
      showToast(`✅ Added reservation for ${savedGuest.name}`);
    }

    setGuests(updatedList);
    setIsEntryModalOpen(false);
    setGuestToEdit(null);

    if (autoSave) {
      localStorage.setItem(getAccountKey("guests"), JSON.stringify(updatedList));
      if (storageMode === "google_sync" && scriptUrl) {
        await callAppsScriptAPI("syncReservations", { reservations: updatedList });
      }
    } else {
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdateGuestStatus = async (id: string, newStatus: RsvpStatus) => {
    const updatedList = guests.map(g => (g.id === id ? { ...g, status: newStatus } : g));
    setGuests(updatedList);
    showToast(`⚡ Status updated to: ${newStatus}`);

    if (autoSave) {
      localStorage.setItem(getAccountKey("guests"), JSON.stringify(updatedList));
      if (storageMode === "google_sync" && scriptUrl) {
        await callAppsScriptAPI("syncReservations", { reservations: updatedList });
      }
    } else {
      setHasUnsavedChanges(true);
    }
  };

  // 2. DELETE BOOKING ACTION
  const handleDeleteGuest = async (id: string) => {
    const target = guests.find(g => g.id === id);
    if (!target) return;

    if (window.confirm(`Are you absolutely sure you want to remove the booking for ${target.name}?`)) {
      const updatedList = guests.filter(g => g.id !== id);
      setGuests(updatedList);
      showToast(`🗑️ ${target.name}'s reservation deleted`);

      if (autoSave) {
        localStorage.setItem(getAccountKey("guests"), JSON.stringify(updatedList));
        if (storageMode === "google_sync" && scriptUrl) {
          await callAppsScriptAPI("syncReservations", { reservations: updatedList });
        }
      } else {
        setHasUnsavedChanges(true);
      }
    }
  };

  const handleBulkUpdateGuestStatus = async (ids: string[], newStatus: RsvpStatus) => {
    const updatedList = guests.map(g => ids.includes(g.id) ? { ...g, status: newStatus } : g);
    setGuests(updatedList);
    showToast(`⚡ Bulk updated status of ${ids.length} reservation(s) to: ${newStatus}`);

    if (autoSave) {
      localStorage.setItem(getAccountKey("guests"), JSON.stringify(updatedList));
      if (storageMode === "google_sync" && scriptUrl) {
        await callAppsScriptAPI("syncReservations", { reservations: updatedList });
      }
    } else {
      setHasUnsavedChanges(true);
    }
  };

  const handleBulkDeleteGuests = async (ids: string[]) => {
    if (window.confirm(`Are you absolutely sure you want to delete the ${ids.length} selected reservation(s)?`)) {
      const updatedList = guests.filter(g => !ids.includes(g.id));
      setGuests(updatedList);
      showToast(`🗑️ Bulk deleted ${ids.length} reservation(s)`);

      if (autoSave) {
        localStorage.setItem(getAccountKey("guests"), JSON.stringify(updatedList));
        if (storageMode === "google_sync" && scriptUrl) {
          await callAppsScriptAPI("syncReservations", { reservations: updatedList });
        }
      } else {
        setHasUnsavedChanges(true);
      }
    }
  };

  // 3. EDIT TRIGGER: Pre-populate and show entry modal
  const handleEditGuestClick = (guest: Guest) => {
    setGuestToEdit(guest);
    setIsEntryModalOpen(true);
  };

  // 4. QUICK WALK-IN / NEW BOOKING DIRECT OVERRIDES
  const handleOpenEntryModalDirect = (type: "Reservation" | "Walk-In") => {
    setEntryModalInitialType(type);
    setGuestToEdit(null);
    setIsEntryModalOpen(true);
  };

  // 5. UPDATE GUEST SEATING TABLE DIRECTLY FROM MAP
  const handleUpdateGuestTableDirect = async (guestId: string, tableName: string, forceStatus?: RsvpStatus) => {
    const updatedList = guests.map(g => {
      if (g.id === guestId) {
        return {
          ...g,
          table: tableName,
          status: forceStatus || g.status
        };
      }
      return g;
    });

    setGuests(updatedList);
    showToast(`🔗 Assigned table to guest`);

    if (autoSave) {
      localStorage.setItem(getAccountKey("guests"), JSON.stringify(updatedList));
      if (storageMode === "google_sync" && scriptUrl) {
        await callAppsScriptAPI("syncReservations", { reservations: updatedList });
      }
    } else {
      setHasUnsavedChanges(true);
    }
  };

  // 6. GENERAL TABLES MANAGER CONF CONFIG SAVE
  const handleUpdateTableConfig = async (newTables: TableConfig[]) => {
    setTables(newTables);
    showToast("⚙️ Table deck configurations updated!");

    if (autoSave) {
      localStorage.setItem(getAccountKey("tables"), JSON.stringify(newTables));
      if (storageMode === "google_sync" && scriptUrl) {
        await callAppsScriptAPI("syncTables", { tables: newTables });
      }
    } else {
      setHasUnsavedChanges(true);
    }
  };

  // 7. CREW MEMBERS CREATION/REMOVAL
  const handleAddStaff = async (name: string) => {
    if (staffList.includes(name)) {
      showToast("👤 Staff member name already exists");
      return;
    }
    const updated = [...staffList, name];
    setStaffList(updated);
    showToast(`👤 Waiting staff ${name} registered`);

    if (autoSave) {
      localStorage.setItem(getAccountKey("staff"), JSON.stringify(updated));
      if (storageMode === "google_sync" && scriptUrl) {
        await callAppsScriptAPI("syncStaff", { staff: updated });
      }
    } else {
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveStaff = async (index: number) => {
    const targetName = staffList[index];
    const updated = staffList.filter((_, i) => i !== index);
    setStaffList(updated);
    showToast(`🗑️ ${targetName} removed from waitstaff`);

    if (autoSave) {
      localStorage.setItem(getAccountKey("staff"), JSON.stringify(updated));
      if (storageMode === "google_sync" && scriptUrl) {
        await callAppsScriptAPI("syncStaff", { staff: updated });
      }
    } else {
      setHasUnsavedChanges(true);
    }
  };

  // 7.5 STORAGE & AUTO-SAVE MANAGEMENT HANDLERS
  const handleUpdateStorageMode = (mode: "local" | "google_sync") => {
    setStorageMode(mode);
    localStorage.setItem(getAccountKey("storage_mode"), mode);
    if (mode === "google_sync") {
      showToast("🌐 Saving mode: Google Sheets Sync (Active auto-backup)");
      if (scriptUrl) {
        executePullFromSheet(scriptUrl);
      }
    } else {
      showToast("💾 Saving mode: Standalone Local Storage (Offline)");
    }
  };

  const handleUpdateAutoSave = (enabled: boolean) => {
    setAutoSave(enabled);
    localStorage.setItem(getAccountKey("auto_save"), String(enabled));
    if (enabled) {
      showToast("💾 Automatic saving turned ON");
      // Persist current memory states immediately
      localStorage.setItem(getAccountKey("guests"), JSON.stringify(guests));
      localStorage.setItem(getAccountKey("tables"), JSON.stringify(tables));
      localStorage.setItem(getAccountKey("staff"), JSON.stringify(staffList));
      if (storageMode === "google_sync" && scriptUrl) {
        callAppsScriptAPI("syncReservations", { reservations: guests });
        callAppsScriptAPI("syncTables", { tables: tables });
        callAppsScriptAPI("syncStaff", { staff: staffList });
      }
      setHasUnsavedChanges(false);
    } else {
      showToast("⚠️ Automatic saving turned OFF (requires manual saves)");
    }
  };

  const handleManualSaveAll = async () => {
    try {
      setIsSyncing(true);
      // Write to local storage
      localStorage.setItem(getAccountKey("guests"), JSON.stringify(guests));
      localStorage.setItem(getAccountKey("tables"), JSON.stringify(tables));
      localStorage.setItem(getAccountKey("staff"), JSON.stringify(staffList));

      if (storageMode === "google_sync" && scriptUrl) {
        showToast("💾 Syncing manual saves directly to Google Sheets...");
        await Promise.all([
          callAppsScriptAPI("syncReservations", { reservations: guests }),
          callAppsScriptAPI("syncTables", { tables: tables }),
          callAppsScriptAPI("syncStaff", { staff: staffList })
        ]);
        showToast("🌐 Memory synchronized perfectly to Google Sheets!");
      } else {
        showToast("💾 Memory persisted successfully to browser LocalStorage!");
      }
      setHasUnsavedChanges(false);
    } catch (e) {
      showToast("⚠️ Manual saving encountered an error.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiscardChanges = () => {
    if (window.confirm("Are you sure you want to discard all unsaved changes since last manual save? This will reload your database to the last cached state on your local storage.")) {
      const cachedGuests = localStorage.getItem(getAccountKey("guests"));
      const cachedTables = localStorage.getItem(getAccountKey("tables"));
      const cachedStaff = localStorage.getItem(getAccountKey("staff"));

      if (cachedGuests) setGuests(JSON.parse(cachedGuests));
      if (cachedTables) setTables(JSON.parse(cachedTables));
      if (cachedStaff) setStaffList(JSON.parse(cachedStaff));

      setHasUnsavedChanges(false);
      showToast("🗑️ Unsaved changes discarded");
    }
  };

  // 8. GOOGLE SHEETS CONNECTION CONFIGURATION
  const handleSaveSyncUrl = (url: string) => {
    setScriptUrl(url);
    if (url) {
      localStorage.setItem(getAccountKey("script_url"), url);
      // Run background pull immediately to capture spreadsheet state
      executePullFromSheet(url);
    } else {
      localStorage.removeItem(getAccountKey("script_url"));
      showToast("🔌 Apps Script Web App unlinked. Now offline local.");
    }
  };

  const handleTestSync = async (testUrl?: string): Promise<boolean> => {
    const urlToTest = testUrl || scriptUrl;
    if (!urlToTest) return false;
    try {
      const response = await fetch(urlToTest, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "getAll" })
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data.success) {
        // Save pulled database values immediately
        if (data.reservations && data.reservations.length > 0) {
          setGuests(data.reservations);
          localStorage.setItem(getAccountKey("guests"), JSON.stringify(data.reservations));
        }
        if (data.tables && data.tables.length > 0) {
          setTables(data.tables);
          localStorage.setItem(getAccountKey("tables"), JSON.stringify(data.tables));
        }
        if (data.staff && data.staff.length > 0) {
          setStaffList(data.staff);
          localStorage.setItem(getAccountKey("staff"), JSON.stringify(data.staff));
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // 9. EXPORT RECORD TO CSV CLIENT DOWNLOAD
  const exportCSV = () => {
    const headers = ["ID", "Name", "Phone", "Type", "Date", "Time", "Pax", "Table Assigned", "Status", "Staff Assigned", "Special Request Notes"];
    
    const rows = guests.map(r => [
      r.id,
      r.name,
      r.phone || "",
      r.type,
      r.date,
      r.time,
      r.pax,
      r.table,
      r.status,
      r.staff || "",
      (r.notes || "").replace(/\n/g, " ")
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `guests_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast("💾 Reservation list exported as CSV");
  };

  // Local helper: Friendly date string for topbar
  const formatFriendlyDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', timeZone: activeTz };
    return new Date().toLocaleDateString(undefined, options);
  };

  if (!loggedUsername) {
    return (
      <div id="guest-rsvp-manager-login-screen-wrap" className="min-h-screen bg-[#f3f6fa]">
        <div
          id="applet-toast-banner"
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl bg-navy border border-gold/40 text-gold-light font-bold text-xs shadow-xl transition-all duration-300 transform z-[2100] flex items-center gap-2.5 ${
            isToastVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span>{toastMessage}</span>
        </div>
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          isSyncing={isSyncing}
          scriptUrl={scriptUrl}
          onSaveUrl={handleSaveSyncUrl}
        />
      </div>
    );
  }

  return (
    <div id="guest-rsvp-manager-applet" className="min-h-screen bg-cream text-navy font-sans antialiased flex flex-col lg:flex-row relative">
      
      {/* Dynamic sync loading glass veil */}
      {isSyncing && (
        <div id="api-syncing-indicator" className="fixed inset-0 bg-[#0f1f38]/30 backdrop-blur-[1px] z-[5000] flex flex-col gap-3 items-center justify-center text-white">
          <div className="bg-navy border border-gold-light/20 p-6 rounded-3xl shadow-2xl flex items-center gap-3.5">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
            <div>
              <p className="font-serif text-sm font-bold text-white tracking-wide">Sheets Database Syncing...</p>
              <p className="text-[10px] text-white/60 uppercase mt-0.5 font-bold tracking-wide">Syncing data reports live</p>
            </div>
          </div>
        </div>
      )}

      {/* Royal Luxury Toast Alert messages */}
      <div
        id="applet-toast-banner"
        className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl bg-navy border border-gold/40 text-gold-light font-bold text-xs shadow-xl transition-all duration-300 transform z-[2100] flex items-center gap-2.5 ${
          isToastVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
        <span>{toastMessage}</span>
      </div>

      {/* Sidebar navigation control */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openEntryModal={handleOpenEntryModalDirect}
        openStaffModal={() => setIsStaffModalOpen(true)}
        openSyncModal={() => setIsSyncModalOpen(true)}
        exportCSV={exportCSV}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isSynced={isSyncing}
        sheetUrlConfigured={!!scriptUrl && storageMode === "google_sync"}
        username={loggedUsername}
        onLogout={handleLogout}
        restaurantName={restaurantName}
        setRestaurantName={handleSaveRestaurantName}
        restaurantPhoto={restaurantPhoto}
        setRestaurantPhoto={handleSaveRestaurantPhoto}
      />

      {/* Primary content view main stage body */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* Elite top navigation bar */}
        <header className="bg-white border-b border-gray-200 min-h-[72px] sticky top-0 z-30 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Hamburger trigger */}
            <button
              id="sidebar-toggle-hamburger"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-slate-50 border border-gray-200 text-navy rounded-xl hover:bg-slate-100 transition cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="font-serif text-xl font-extrabold text-navy leading-none">
                {activeTab === "dashboard" && "Dashboard Snapshots"}
                {activeTab === "reservations" && "Reservations Registry"}
                {activeTab === "tablemap" && "Dining Floor Grid"}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-1 uppercase">
                {activeTab === "dashboard" && "Live Metrics Analytics & Snapshot"}
                {activeTab === "reservations" && "Search, Filter, Export & Modify List"}
                {activeTab === "tablemap" && "Interactive Seating map and linking"}
              </p>
            </div>

            {/* Date Indicator tag */}
            <span id="header-today-date-badge" className="hidden sm:inline-block bg-gold-pale border border-gold-light text-gold text-xs font-bold px-4 py-1.5 rounded-full uppercase ml-2 tracking-wide">
              📅 {formatFriendlyDate()} <span className="ml-1 text-navy opacity-80">🕒 {currentTime}</span>
            </span>
          </div>

          {/* Quick Action headers inside the Topbar */}
          <div className="flex items-center gap-2">
            {scriptUrl && (
              <button
                id="header-manual-sync-btn"
                onClick={() => executePullFromSheet(scriptUrl)}
                disabled={isSyncing}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-full border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 inline-flex items-center shadow-2xs"
                title="Force refresh & sync with remote Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Sync Now</span>
              </button>
            )}

            <button
              id="header-quick-walkin-btn"
              onClick={() => handleOpenEntryModalDirect("Walk-In")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-full border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              🚶 Log Walk-In
            </button>

            <button
              id="header-quick-booking-btn"
              onClick={() => handleOpenEntryModalDirect("Reservation")}
              className="px-4 py-2 bg-gold hover:bg-gold-light text-white font-bold text-xs rounded-full border border-gold-light transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              ➕ Book Reservation
            </button>
          </div>
        </header>

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div id="unsaved-changes-banner" className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-navy text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="truncate">You have unsaved changes in-memory (Autosave is suspended). Please save or synchronise manually.</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                id="banner-discard-btn"
                onClick={handleDiscardChanges}
                className="px-3.5 py-1 text-slate-600 bg-white hover:bg-slate-50 border border-slate-250 rounded-lg text-[10px] font-bold transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                id="banner-save-btn"
                onClick={handleManualSaveAll}
                className="px-4 py-1 text-white bg-amber-500 hover:bg-amber-600 rounded-lg text-[10px] font-bold transition cursor-pointer shadow-xs"
              >
                Save All
              </button>
            </div>
          </div>
        )}

        {/* Content view body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === "dashboard" && (
            <DashboardView
              guests={guests}
              onEditGuest={handleEditGuestClick}
              onDeleteGuest={handleDeleteGuest}
              onUpdateStatus={handleUpdateGuestStatus}
              timezone={activeTz}
            />
          )}

          {activeTab === "reservations" && (
            <ReservationsView
              guests={guests}
              onEditGuest={handleEditGuestClick}
              onDeleteGuest={handleDeleteGuest}
              onUpdateStatus={handleUpdateGuestStatus}
              onBulkUpdateStatus={handleBulkUpdateGuestStatus}
              onBulkDeleteGuests={handleBulkDeleteGuests}
            />
          )}

          {activeTab === "tablemap" && (
            <TableMapView
              guests={guests}
              tables={tables}
              onUpdateTableConfig={handleUpdateTableConfig}
              onUpdateGuestTable={handleUpdateGuestTableDirect}
              openEntryModal={handleOpenEntryModalDirect}
              timezone={activeTz}
            />
          )}
        </main>

      </div>

      {/* 1. GUEST BOOKING ADD/EDIT MODAL OVERLAY */}
      <EntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setGuestToEdit(null);
        }}
        onSave={handleSaveGuest}
        guestToEdit={guestToEdit}
        tables={tables}
        staffList={staffList}
        initialType={entryModalInitialType}
        timezone={activeTz}
        guestsKey={getAccountKey("guests")}
      />

      {/* 2. CREW/STAFF manager modal overlay */}
      <StaffManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        onAddStaff={handleAddStaff}
        onRemoveStaff={handleRemoveStaff}
      />

      {/* 3. GOOGLE SHEETS SYNC CONTROL PANELS HUB */}
      <SyncConfigPanel
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        scriptUrl={scriptUrl}
        onSaveUrl={handleSaveSyncUrl}
        onTestSync={handleTestSync}
        storageMode={storageMode}
        onUpdateStorageMode={handleUpdateStorageMode}
        autoSave={autoSave}
        onUpdateAutoSave={handleUpdateAutoSave}
        hasUnsavedChanges={hasUnsavedChanges}
        onManualSave={handleManualSaveAll}
        onDiscardChanges={handleDiscardChanges}
      />



    </div>
  );
}
