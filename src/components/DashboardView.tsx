/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Guest, RsvpStatus, EntryType } from "../types";
import { User, Users, CheckCircle, HelpCircle, Utensils, Clipboard, Clock } from "lucide-react";
import { getTodayStringInTimezone } from "../utils/timezone";

interface DashboardViewProps {
  guests: Guest[];
  onEditGuest: (guest: Guest) => void;
  onDeleteGuest: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: RsvpStatus) => void;
  timezone?: string;
}

export default function DashboardView({ guests, onEditGuest, onDeleteGuest, onUpdateStatus, timezone }: DashboardViewProps) {
  // Get today's date in YYYY-MM-DD
  const getTodayString = () => {
    return getTodayStringInTimezone(timezone || "UTC");
  };

  const getTableIcon = (tableName: string) => {
    try {
      const cachedTables = localStorage.getItem("guest_rsvp_mngr_tables");
      if (cachedTables) {
        const parsed = JSON.parse(cachedTables);
        const match = parsed.find((t: any) => t.name === tableName);
        if (match && match.icon) return match.icon;
      }
    } catch (e) {}
    return "🔥";
  };

  const todayStr = getTodayString();
  const todayGuests = guests.filter(g => g.date === todayStr);

  const activeTodayGuests = todayGuests.filter(g => g.status !== RsvpStatus.DEPARTED);
  const activeTodayWaitlist = activeTodayGuests.filter(g => g.isWaitlist).length;
  const activeTodayReservations = activeTodayGuests.filter(g => g.type === EntryType.RESERVATION && !g.isWaitlist).length;
  const activeTodayWalkins = activeTodayGuests.filter(g => g.type === EntryType.WALK_IN && !g.isWaitlist).length;

  // KPIs calculations
  const todayWaitlistCount = todayGuests.filter(g => g.isWaitlist).length;
  const todayReservations = todayGuests.filter(g => g.type === EntryType.RESERVATION && !g.isWaitlist).length;
  const todayWalkins = todayGuests.filter(g => g.type === EntryType.WALK_IN && !g.isWaitlist).length;
  const todayCount = todayGuests.length;
  const todayPax = todayGuests.reduce((acc, curr) => acc + (curr.pax || 0), 0);
  const todayConfirmed = todayGuests.filter(g => g.status === RsvpStatus.CONFIRMED).length;
  const todaySeated = todayGuests.filter(g => g.status === RsvpStatus.SEATED).length;
  const totalAllTime = guests.length;

  // Status breakdown calculations (for all reservations or today's, let's look at all-time or today's. Let's do all-time for robust analytics, or today's)
  // The original script did it for ALL reservations:
  const statuses = [
    { label: RsvpStatus.CONFIRMED, color: "bg-emerald-500" },
    { label: RsvpStatus.SEATED, color: "bg-indigo-500" },
    { label: RsvpStatus.PENDING, color: "bg-amber-400" },
    { label: RsvpStatus.NO_SHOW, color: "bg-orange-500" },
    { label: RsvpStatus.CANCELLED, color: "bg-rose-500" }
  ];

  const statusCounts = statuses.map(s => {
    const count = todayGuests.filter(g => g.status === s.label).length;
    return { ...s, count };
  });
  const maxStatusCount = Math.max(...statusCounts.map(s => s.count), 1);

  // Popular time slots
  const slots = [
    { time: "12:00 PM", search: "12:00 PM" },
    { time: "06:00 PM", search: "06:00 PM" },
    { time: "07:00 PM", search: "07:00 PM" },
    { time: "08:00 PM", search: "08:00 PM" }
  ];

  const slotCounts = slots.map(slot => {
    const count = todayGuests.filter(g => g.time && g.time.includes(slot.search)).length;
    return { ...slot, count };
  });
  const maxSlotCount = Math.max(...slotCounts.map(s => s.count), 1);

  const getStatusBadgeClass = (status: RsvpStatus) => {
    switch (status) {
      case RsvpStatus.CONFIRMED:
        return "bg-emerald-50 text-emerald-800 border border-emerald-200";
      case RsvpStatus.SEATED:
        return "bg-blue-50 text-blue-800 border border-blue-200";
      case RsvpStatus.PENDING:
        return "bg-amber-50 text-amber-800 border border-amber-200";
      case RsvpStatus.NO_SHOW:
        return "bg-orange-50 text-orange-800 border border-orange-200";
      case RsvpStatus.CANCELLED:
        return "bg-rose-50 text-rose-800 border border-rose-200";
      case RsvpStatus.ARRIVED:
        return "bg-emerald-600 text-white border border-emerald-750 font-extrabold shadow-3xs";
      case RsvpStatus.DEPARTED:
        return "bg-slate-500 text-white border border-slate-600 font-extrabold shadow-3xs";
      default:
        return "bg-slate-50 text-slate-800 border border-slate-200";
    }
  };

  const getTypeBadgeClass = (type: EntryType) => {
    return type === EntryType.WALK_IN
      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
      : "bg-indigo-50 text-indigo-700 border border-indigo-100";
  };

  return (
    <div id="dashboard-view-main" className="space-y-8 animate-fadeIn">
      {/* Welcome header section */}
      <div>
        <h2 className="font-serif text-3xl font-bold text-navy tracking-tight">
          Good day 👋
        </h2>
        <p className="text-sm text-[#4b5c73] mt-1.5 font-medium">
          Here is a detailed snapshot of your service for today.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {/* Today Booked Reservations */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Reservations</span>
            <Clipboard className="w-4 h-4 text-navy-soft" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todayReservations}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Booked RSVPs</p>
          </div>
        </div>

        {/* Walk-Ins */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Walk-ins</span>
            <User className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todayWalkins}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Unscheduled arrivals</p>
          </div>
        </div>

        {/* Waitlist Category */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Waitlist</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-amber-600">
              {todayWaitlistCount}
            </div>
            <p className="text-xs text-amber-705 text-amber-700 font-medium mt-1 leading-none">Queue waiting</p>
          </div>
        </div>

        {/* Pax */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Pax</span>
            <Users className="w-4 h-4 text-gold" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todayPax}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Total guests</p>
          </div>
        </div>

        {/* Confirmed */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todayConfirmed}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Attending tables</p>
          </div>
        </div>

        {/* Seated */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Seated</span>
            <Utensils className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {todaySeated}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">Guests seated</p>
          </div>
        </div>

        {/* Total Reserves */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a9ab5] mb-4">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <HelpCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="font-serif text-4xl font-extrabold text-[#0f1f38]">
              {totalAllTime}
            </div>
            <p className="text-xs text-[#8a9ab5] mt-1 leading-none">All-time entries</p>
          </div>
        </div>
      </div>

      {/* Analytics Bars and Hourly Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs">
          <h4 className="font-serif text-base font-bold text-navy mb-5 uppercase tracking-wide">
            📊 Today's Status Breakdown
          </h4>
          <div className="space-y-4">
            {statusCounts.map(status => {
              const pct = maxStatusCount > 0 ? (status.count / maxStatusCount) * 100 : 0;
              return (
                <div key={status.label} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-semibold text-navy-soft">
                    {status.label}
                  </div>
                  <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full ${status.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-bold text-navy">
                    {status.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Slots Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs">
          <h4 className="font-serif text-base font-bold text-navy mb-5 uppercase tracking-wide">
            🕐 Popular Time Slots Today
          </h4>
          <div className="space-y-4">
            {slotCounts.map(slot => {
              const pct = maxSlotCount > 0 ? (slot.count / maxSlotCount) * 100 : 0;
              return (
                <div key={slot.time} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-semibold text-navy-soft">
                    {slot.time}
                  </div>
                  <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gold rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-bold text-navy">
                    {slot.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's Guests list Card */}
      <div className="bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-xs">
        <div className="px-6 py-5 border-b border-gray-150 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-navy">
              Today's Guests
            </h3>
            <p className="text-xs text-[#8a9ab5] font-medium mt-0.5">
              Service schedule for today's physical sittings
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full">
              📋 {activeTodayReservations} Reservations
            </span>
            <span className="px-3.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full">
              🚶 {activeTodayWalkins} Walk-ins
            </span>
            {activeTodayWaitlist > 0 && (
              <span className="px-3.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-full animate-pulse">
                ⏳ {activeTodayWaitlist} Waitlist
              </span>
            )}
          </div>
        </div>
 
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-navy text-white font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-5">Guest Name</th>
                <th className="py-4 px-5">Type</th>
                <th className="py-4 px-5">Pax</th>
                <th className="py-4 px-5">Table Assignment</th>
                <th className="py-4 px-5">Arrive / Depart</th>
                <th className="py-4 px-5">Service Status</th>
                <th className="py-4 px-5">Special Notes</th>
                <th className="py-4 px-5 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {activeTodayGuests.length > 0 ? (
                activeTodayGuests.map(r => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-5 font-bold text-navy text-sm">
                      {r.name}
                    </td>
                    <td className="py-4 px-5">
                      {r.isWaitlist ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase bg-amber-50 border border-amber-200 text-amber-700">
                          ⏳ Waitlist
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase ${getTypeBadgeClass(r.type)}`}>
                          {r.type === EntryType.WALK_IN ? "🚶 Walk-In" : "📋 RSVP"}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-bold text-navy">
                      {r.pax}
                    </td>
                    <td className="py-4 px-5 font-medium text-[#4b5c73]">
                      {r.table && r.table !== "Unassigned" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                          {getTableIcon(r.table)} {r.table}
                        </span>
                      ) : (
                        <span className="text-[#8a9ab5] font-normal italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <div className="inline-flex rounded-lg border border-slate-205 p-0.5 bg-slate-50 gap-0.5 shadow-3xs">
                        <button
                          onClick={() => onUpdateStatus(r.id, r.status === RsvpStatus.ARRIVED ? RsvpStatus.CONFIRMED : RsvpStatus.ARRIVED)}
                          className={`px-2 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                            r.status === RsvpStatus.ARRIVED
                              ? "bg-emerald-600 text-white font-extrabold shadow-3xs"
                              : "text-slate-500 hover:text-navy hover:bg-slate-100"
                          }`}
                          title={r.status === RsvpStatus.ARRIVED ? "Arrived - Click to edit" : "Mark as Arrived"}
                        >
                          Arrive
                        </button>
                        <button
                          onClick={() => onUpdateStatus(r.id, r.status === RsvpStatus.DEPARTED ? RsvpStatus.ARRIVED : RsvpStatus.DEPARTED)}
                          className={`px-2 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                            r.status === RsvpStatus.DEPARTED
                              ? "bg-slate-500 text-white font-extrabold shadow-3xs"
                              : "text-slate-500 hover:text-navy hover:bg-slate-100"
                          }`}
                          title={r.status === RsvpStatus.DEPARTED ? "Departed - Click to edit" : "Mark as Departed"}
                        >
                          Depart
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold inline-block text-center ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-500 max-w-[180px] truncate" title={r.notes}>
                      {r.notes || "—"}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => onEditGuest(r)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 border border-indigo-150 hover:bg-indigo-100/70 text-indigo-700 transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <span className="text-3xl block mb-2">🍽️</span>
                    <p className="text-sm text-[#8a9ab5] font-medium">No service reservations scheduled for today</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
