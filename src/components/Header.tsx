import React, { useEffect, useRef } from "react";
import { 
  Clock, 
  Upload, 
  Download, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Utensils,
  LogIn,
  LogOut,
  UserCheck,
  Coins
} from "lucide-react";
import { AppUser } from "../types";

interface HeaderProps {
  liveTime: Date;
  activeShift: string;
  setActiveShift: (shift: string) => void;
  onUploadExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onLoadSample: () => void;
  catalogLength: number;
  errorMessage: string | null;
  clearError: () => void;
  
  // Authentication properties
  user: AppUser | null;
  onSignIn: () => void;
  onSignOut: () => void;

  // Currency properties
  currency: { symbol: string; code: string };
  onCurrencyChange: (currency: { symbol: string; code: string }) => void;
}

export default function Header({
  liveTime,
  activeShift,
  setActiveShift,
  onUploadExcel,
  onDownloadTemplate,
  onLoadSample,
  catalogLength,
  errorMessage,
  clearError,
  user,
  onSignIn,
  onSignOut,
  currency,
  onCurrencyChange
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format Date elegant
  const formatFullDate = (d: Date): string => {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFullTime = (d: Date): string => {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 py-5 sm:px-6 lg:px-8 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Brand & Shift Info */}
        <div className="flex items-start gap-4">
          <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-md shadow-emerald-500/20 shrink-0">
            <Utensils className="h-7 w-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-black tracking-tight text-slate-900">
                Kitchen Ordering System
              </h1>
              
              <span className={`inline-flex items-center font-sans text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                user 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" 
                  : "bg-slate-50 text-slate-700 border-slate-200/80"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${user ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                {user ? `${user.role || "Admin"} Session Active` : "Offline Database Hub"}
              </span>
            </div>
            
            {/* Meta Data & Real Time clock */}
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {formatFullDate(liveTime)} at {formatFullTime(liveTime)}
              </span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span>Catalog Size: <strong className="text-slate-700">{catalogLength} Active Items</strong></span>
            </div>
          </div>
        </div>

        {/* Auth / Shift / Actions workspace */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:gap-5">
          
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Template actions */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Upload custom XLSX / CSV Catalog"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload xlsx
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onUploadExcel}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <button
              onClick={onLoadSample}
              title="Reset order catalog to demo data"
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 lg:inline-flex hidden transition cursor-pointer bg-white"
            >
              <Sparkles className="h-4 w-4" />
            </button>

            <button
              onClick={onDownloadTemplate}
              title="Download clean warehouse XLSX catalog template"
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 lg:inline-flex hidden transition cursor-pointer bg-white"
            >
              <Download className="h-4 w-4" />
            </button>

            {/* Currency Selector */}
            {!user?.isSubAccount && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-slate-600 inline-flex transition hover:border-slate-300">
                <Coins className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 select-none">Curr:</span>
                <select
                  id="default-currency-select"
                  value={JSON.stringify(currency)}
                  onChange={(e) => {
                    try {
                      onCurrencyChange(JSON.parse(e.target.value));
                    } catch (err) {
                      console.error("Failed to parse currency selection", err);
                    }
                  }}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-hidden pr-1 cursor-pointer"
                  title="Choose default currency for the system"
                >
                  <option value={JSON.stringify({ symbol: "KD", code: "KWD" })}>KWD (KD)</option>
                  <option value={JSON.stringify({ symbol: "£", code: "GBP" })}>GBP (£)</option>
                  <option value={JSON.stringify({ symbol: "$", code: "USD" })}>USD ($)</option>
                  <option value={JSON.stringify({ symbol: "€", code: "EUR" })}>EUR (€)</option>
                  <option value={JSON.stringify({ symbol: "AED", code: "AED" })}>AED</option>
                  <option value={JSON.stringify({ symbol: "SAR", code: "SAR" })}>SAR</option>
                  <option value={JSON.stringify({ symbol: "₱", code: "PHP" })}>PHP (₱)</option>
                  <option value={JSON.stringify({ symbol: "₹", code: "INR" })}>INR (₹)</option>
                  <option value={JSON.stringify({ symbol: "kr", code: "SEK" })}>SEK (kr)</option>
                  <option value={JSON.stringify({ symbol: "kr", code: "NOK" })}>NOK (kr)</option>
                  <option value={JSON.stringify({ symbol: "kr", code: "DKK" })}>DKK (kr)</option>
                  <option value={JSON.stringify({ symbol: "CHF", code: "CHF" })}>CHF</option>
                </select>
              </div>
            )}

            {/* Google Authentication Control */}
            <div className="border-l border-slate-200 pl-3 ml-1 flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2 bg-emerald-50/60 p-1.5 pl-2.5 rounded-xl border border-emerald-100">
                  <div className="text-left shrink-0">
                    <span className="block text-[10px] text-emerald-800 font-bold max-w-[110px] truncate leading-tight">
                      {user.displayName || user.username || "Chef"}
                    </span>
                    <span className="block text-[8px] text-emerald-600 font-mono leading-none">
                      {user.isAdmin ? "System Admin" : `${user.role || "Staff"} Account`}
                    </span>
                  </div>
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Avatar" 
                      className="h-7 w-7 rounded-lg border border-emerald-100 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center font-sans uppercase">
                      {(user.displayName || user.username)?.[0] || "C"}
                    </div>
                  )}
                  <button
                    onClick={onSignOut}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 px-3.5 py-2 rounded-xl text-xs font-black shadow-sm tracking-wide cursor-pointer transition active:scale-95"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Error notification bar if failed to upload */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto mt-4 bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3 text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold font-sans">Catalog Import Suspended</h4>
            <p className="text-xs text-rose-700 mt-1">{errorMessage}</p>
          </div>
          <button
            onClick={clearError}
            className="text-xs font-mono font-bold text-rose-500 hover:text-rose-700 px-1 py-0.5 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </header>
  );
}
