import React, { useMemo, useState } from "react";
import { KitchenItem, OrderItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingCart, 
  Trash2, 
  FileSpreadsheet, 
  ArrowRight,
  Info,
  ChevronRight,
  Package,
  Sparkles,
  DollarSign,
  Printer,
  Plus,
  Minus,
  CheckCircle2,
  ListTodo
} from "lucide-react";
import KitchenPrintPreview from "./KitchenPrintPreview";

interface SidebarCartProps {
  items: KitchenItem[];
  quantities: Record<string, number>;
  activeShift: string;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onClearDraft: () => void;
  onSubmitOrder: () => void;
  currency?: { symbol: string; code: string };
  notes: string;
  onNotesChange: (notes: string) => void;
  isSubAccount?: boolean;
}

// Deterministic aesthetic styling for custom and standard categories to align with main catalog
const CATEGORY_CHIPS: Record<string, { bg: string; text: string; dot: string }> = {
  Produce: { bg: "bg-emerald-50 border-emerald-150", text: "text-emerald-700", dot: "bg-emerald-500" },
  Sauces: { bg: "bg-rose-50 border-rose-150", text: "text-rose-700", dot: "bg-rose-500" },
  Bakery: { bg: "bg-amber-50 border-amber-150", text: "text-amber-850", dot: "bg-amber-500" },
  Meat: { bg: "bg-red-50 border-red-150", text: "text-red-700", dot: "bg-red-500" },
  General: { bg: "bg-sky-50 border-sky-150", text: "text-sky-700", dot: "bg-sky-500" }
};

const getCategoryChipStyle = (cat: string) => {
  if (CATEGORY_CHIPS[cat]) return CATEGORY_CHIPS[cat];
  const hash = cat.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorBands = [
    { bg: "bg-violet-50 border-violet-150", text: "text-violet-700 font-bold", dot: "bg-violet-500" },
    { bg: "bg-teal-50 border-teal-150", text: "text-teal-700 font-bold", dot: "bg-teal-500" },
    { bg: "bg-orange-50 border-orange-150", text: "text-orange-855 font-bold", dot: "bg-orange-500" },
    { bg: "bg-fuchsia-50 border-fuchsia-150", text: "text-fuchsia-700 font-bold", dot: "bg-fuchsia-500" }
  ];
  return colorBands[hash % colorBands.length];
};

export default function SidebarCart({
  items,
  quantities,
  activeShift,
  onQuantityChange,
  onClearDraft,
  onSubmitOrder,
  currency = { symbol: "£", code: "GBP" },
  notes,
  onNotesChange,
  isSubAccount = false,
}: SidebarCartProps) {
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  
  // Extract drafted items list
  const draftedItems = useMemo(() => {
    const list: OrderItem[] = [];
    items.forEach(item => {
      const q = quantities[item.Item_ID] || 0;
      if (q > 0) {
        const rate = item.Rate || 0;
        list.push({
          Item_ID: item.Item_ID,
          Category: item.Category,
          Item_Name: item.Item_Name,
          Quantity: q,
          Unit_Type: item.Unit_Type,
          Rate: rate,
          Gross: q * rate
        });
      }
    });
    return list;
  }, [items, quantities]);

  // Calculations
  const totalItemTypes = draftedItems.length;
  const totalItemVolume = draftedItems.reduce((acc, curr) => acc + curr.Quantity, 0);
  const totalFinancialGross = draftedItems.reduce((acc, curr) => acc + curr.Gross, 0);
  const isCartEmpty = draftedItems.length === 0;

  if (isCartEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[460px] max-w-2xl mx-auto"
        id="empty-cart-container"
      >
        <div className="bg-slate-50 p-5 rounded-2xl text-slate-350 mb-4 border border-dashed border-slate-200 shadow-inner relative">
          <ShoppingCart className="h-9 w-9 text-slate-400" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-slate-300 border-2 border-white" />
        </div>
        <h3 className="font-display font-black text-slate-800 text-lg tracking-tight">
          Staging Manifest is Quiet
        </h3>
        <p className="text-slate-500 text-xs mt-2 max-w-md leading-relaxed font-sans">
          You haven't requested any items for this shift yet. Navigate to the Interacting Master Catalog on the left, type ingredient keywords, and adjust units to compile your manifest here.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-6" id="complete-checkout-workspace">
      
      {/* Responsive Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Detailed Interactive Manifest Sheet */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-xs flex flex-col">
            
            {/* Manifest Header Controls */}
            <div className="px-5 py-4 bg-slate-50/75 border-b border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 border border-emerald-150 p-2 rounded-xl text-emerald-700 shadow-xs">
                  <ListTodo className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-800 text-sm">
                    Drafted Ingredients Manifest
                  </h3>
                  <p className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-wider mt-0.5">
                    Live compilation of shift requirements
                  </p>
                </div>
              </div>

              <button
                id="wipe-draft-manifest-btn"
                onClick={onClearDraft}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:bg-rose-50 border border-transparent hover:border-rose-100 px-3 py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Wipe Staging
              </button>
            </div>

            {/* Interactive Layout Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/30 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-4 pl-5">Code</th>
                    <th className="p-4">Ingredient Description</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Procurement Unit</th>
                    <th className="p-4 text-center w-36">Draft Quantity</th>
                    {!isSubAccount && (
                      <>
                        <th className="p-4 text-right">Unit Rate</th>
                        <th className="p-4 text-right pr-5">Gross Line Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-xs">
                  <AnimatePresence mode="popLayout">
                    {draftedItems.map((orderItem) => {
                      const chip = getCategoryChipStyle(orderItem.Category);
                      return (
                        <motion.tr
                          key={orderItem.Item_ID}
                          layoutId={`sheet-row-${orderItem.Item_ID}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          {/* Item ID Code */}
                          <td className="p-4 pl-5 font-mono text-xs font-bold text-slate-605">
                            {orderItem.Item_ID}
                          </td>

                          {/* Item Name */}
                          <td className="p-4 text-slate-800 font-bold font-sans">
                            {orderItem.Item_Name}
                          </td>

                          {/* Dynamic Category chip */}
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${chip.bg} ${chip.text}`}>
                              <span className={`h-1 w-1 rounded-full ${chip.dot}`} />
                              {orderItem.Category}
                            </span>
                          </td>

                          {/* Unit type description */}
                          <td className="p-4 text-center text-slate-400 font-medium font-sans">
                            {orderItem.Unit_Type}
                          </td>

                          {/* Interactive Quantity Stepper */}
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl shadow-inner group-hover:bg-white transition-all">
                              <button
                                type="button"
                                onClick={() => onQuantityChange(orderItem.Item_ID, Math.max(0, orderItem.Quantity - 1))}
                                className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                                title="Subtract Unit"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                className="w-10 text-center font-mono font-bold text-xs text-slate-800 bg-transparent border-none focus:outline-hidden"
                                value={orderItem.Quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  onQuantityChange(orderItem.Item_ID, isNaN(val) ? 1 : Math.max(1, val));
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => onQuantityChange(orderItem.Item_ID, orderItem.Quantity + 1)}
                                className="h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                                title="Add Unit"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>

                          {/* Unit Rate */}
                          {!isSubAccount && (
                            <td className="p-4 text-right font-mono text-slate-550 font-bold">
                              {currency.symbol}{orderItem.Rate.toFixed(2)}
                            </td>
                          )}

                          {/* Gross Price with delete button */}
                          <td className="p-4 text-right pr-5">
                            <div className="flex items-center justify-end gap-3.5">
                              {!isSubAccount && (
                                <span className="font-mono text-xs font-black text-emerald-800">
                                  {currency.symbol}{orderItem.Gross.toFixed(2)}
                                </span>
                              )}
                              <button
                                onClick={() => onQuantityChange(orderItem.Item_ID, 0)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer border border-transparent hover:border-rose-100/60"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Sub-Manifest statistics */}
            <div className="bg-slate-50/50 p-4 border-t border-slate-150 flex items-center justify-between text-xs text-slate-500 font-sans font-medium">
              <span>Dynamic Staging Pipeline</span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Computed live using encrypted local schemas</span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Control & Transmit Console */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Summary Totals Card - TARGETED FOR FOCUSED ELEMENT */}
          <div 
            id="summary-totals-card"
            className="bg-emerald-600 rounded-2xl border border-emerald-700/80 p-5 text-white shadow-md relative overflow-hidden flex flex-col gap-4 group"
          >
            {/* Aesthetic cosmic/emerald design overlays */}
            <div className="absolute top-0 right-0 h-32 w-32 bg-white/5 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute bottom-0 left-0 h-16 w-16 bg-black/10 rounded-full -ml-8 -mb-8 pointer-events-none" />

            <div className="flex items-center gap-3">
              <div className="bg-emerald-550/80 p-2.5 rounded-xl border border-emerald-500 shadow-sm shrink-0">
                <Package className="h-5 w-5 text-emerald-100" />
              </div>
              <div>
                <h3 className="font-display font-black text-sm uppercase tracking-wider text-emerald-100">
                  Summary Totals
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-emerald-250">
                  <span className="font-extrabold">{totalItemTypes}</span> types
                  <span>•</span>
                  <span className="font-extrabold">{totalItemVolume}</span> cumulative units
                </div>
              </div>
            </div>

            <div className="border-t border-emerald-500/50 pt-4 flex items-end justify-between">
              <div>
                <span className="block text-[9px] uppercase tracking-widest text-emerald-200 font-extrabold">
                  {isSubAccount ? "Total Cumulative Units" : "Cumulative Gross Valuation"}
                </span>
                <span className="block font-sans text-2xl font-black text-white mt-1 leading-none">
                  {isSubAccount ? `${totalItemVolume} units` : `${currency.symbol}${totalFinancialGross.toFixed(2)}`}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-emerald-100 border border-emerald-400/30 text-[9px] font-extrabold uppercase font-mono tracking-wider animate-pulse">
                {activeShift} active
              </span>
            </div>
          </div>

          {/* Delivery instruction / notes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans flex items-center justify-between">
              <span>Custom Prep & Shift Notes</span>
              <span className="text-[9px] font-bold text-slate-400 lowercase italic font-sans">
                Optional
              </span>
            </label>
            <textarea
              id="manifest-notes-textarea"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add delivery instruction prompts, prep detail reminders, or supplier notifications..."
              rows={3}
              className="w-full text-xs p-3 border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 hover:border-slate-300 transition-all font-sans text-slate-700 bg-slate-50 placeholder:text-slate-400 font-medium resize-none shadow-inner"
            />
          </div>

          {/* Core Dispatch Actions */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-3">
            <button
              id="transmit-manifest-action-btn"
              onClick={onSubmitOrder}
              disabled={isCartEmpty}
              className={`w-full py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                isCartEmpty
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.98] shadow-emerald-600/10 hover:shadow-md"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Transmit Manifest File
            </button>

            <button
              id="print-manifest-paper-btn"
              onClick={() => setIsPrintOpen(true)}
              disabled={isCartEmpty}
              className={`w-full py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 border ${
                isCartEmpty
                  ? "bg-slate-50 text-slate-400 border-slate-150 cursor-not-allowed shadow-none"
                  : "bg-white hover:bg-slate-50 border-slate-350 text-slate-700 hover:text-slate-900 cursor-pointer shadow-inner-sm active:scale-[0.98]"
              }`}
            >
              <Printer className="h-4 w-4" />
              Print Paper Copy
            </button>

            {/* Helper helpful box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80 flex gap-3 items-start mt-1">
              <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5 animate-pulse" />
              <p className="text-[10.5px] text-slate-500 leading-relaxed font-sans font-medium">
                Our dynamic ordering engine processes selected quantities into a fully production-ready spreadsheet (`.xlsx`) containing exact shift rates and cumulative sums.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Print Preview Overlay */}
      <KitchenPrintPreview
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        items={items}
        quantities={quantities}
        activeShift={activeShift}
        currency={currency}
        isSubAccount={isSubAccount}
      />

    </div>
  );
}
