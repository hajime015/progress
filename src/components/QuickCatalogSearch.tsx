import React, { useState, useMemo, useRef, useEffect } from "react";
import { KitchenItem } from "../types";
import { 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Check, 
  Sparkles, 
  Tag, 
  SlidersHorizontal,
  PackageCheck,
  AlertTriangle,
  X
} from "lucide-react";

interface QuickCatalogSearchProps {
  items: KitchenItem[];
  quantities: Record<string, number>;
  onQuantityChange: (itemId: string, qty: number) => void;
  currency: { symbol: string; code: string };
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchExactCode: string;
  setSearchExactCode: (val: string) => void;
}

export function QuickCatalogSearch({
  items,
  quantities,
  onQuantityChange,
  currency,
  searchQuery,
  setSearchQuery,
  searchExactCode,
  setSearchExactCode,
}: QuickCatalogSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Individual item quantity inputs for suggestions before ordering
  const [draftQtys, setDraftQtys] = useState<Record<string, string>>({});

  // Clean suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute matches instantly
  const suggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (!query) return [];

    return items
      .filter((item) => {
        const nameMatch = item.Item_Name.toLowerCase().includes(query);
        const idMatch = item.Item_ID.toLowerCase().includes(query);
        const catMatch = (item.Category || "").toLowerCase().includes(query);
        const supplierMatch = (item.Supplier || "").toLowerCase().includes(query);
        return nameMatch || idMatch || catMatch || supplierMatch;
      })
      .slice(0, 5); // Limit to top 5 exact results for maximum screen elegance
  }, [items, inputValue]);

  // Handle arrow navigation and instant select
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        handleSelectItem(suggestions[focusedIndex]);
      } else if (suggestions.length > 0) {
        handleSelectItem(suggestions[0]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSelectItem = (item: KitchenItem) => {
    // Fill search filters so the master catalog automatically isolates this card/record too
    setInputValue(item.Item_Name);
    setSearchQuery(item.Item_Name);
    setSearchExactCode(item.Item_ID);
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  const handleQuantityAdjust = (itemId: string, newQty: number) => {
    onQuantityChange(itemId, Math.max(0, newQty));
  };

  const currentOrderedCount = useMemo(() => {
    return Object.values(quantities).filter((q) => q > 0).length;
  }, [quantities]);

  const handleClear = () => {
    setInputValue("");
    setSearchQuery("");
    setSearchExactCode("");
    setShowSuggestions(false);
    setFocusedIndex(-1);
  };

  return (
    <div 
      ref={containerRef}
      className="bg-white rounded-2xl border border-slate-205/90 shadow-sm p-4 md:p-5 flex flex-col gap-4 relative group"
    >
      {/* Main input search field */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-emerald-600" />
          <input
            type="text"
            value={inputValue}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              const val = e.target.value;
              setInputValue(val);
              setSearchQuery(val);
              // reset exact code if user modified search to ensure fuzzy catalog is shown
              if (searchExactCode) setSearchExactCode("");
              setShowSuggestions(true);
              setFocusedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a product name or custom ID (e.g., PRD-01, BAU-02, Basil)..."
            className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-slate-50 hover:bg-slate-50/55 focus:bg-white border border-slate-200/90 focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-sans font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal"
          />
          {inputValue && (
            <button
              onClick={handleClear}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              title="Clear Search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic drop-down suggestions autocomplete (matching image workflow) */}
        {showSuggestions && inputValue.trim().length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => {
                const isSelected = index === focusedIndex;
                const qtyInCart = quantities[item.Item_ID] || 0;
                
                // Track direct digit state for order-sheet input speed
                const currentDraftVal = draftQtys[item.Item_ID] ?? (qtyInCart > 0 ? String(qtyInCart) : "");

                return (
                  <div
                    key={item.Item_ID}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`p-3 transition-colors flex items-center justify-between gap-4 ${
                      isSelected ? "bg-emerald-50/40" : "bg-white"
                    }`}
                  >
                    {/* Item identification */}
                    <button
                      onClick={() => handleSelectItem(item)}
                      className="flex-1 text-left flex items-start gap-2.5 group/item cursor-pointer"
                    >
                      <span className="font-mono text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                        {item.Item_ID}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 group-hover/item:text-emerald-700 transition-colors">
                          {item.Item_Name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans font-medium">
                          {item.Category} {item.Supplier ? `• ${item.Supplier}` : ""}
                        </span>
                      </div>
                    </button>

                    {/* Stock level indicators */}
                    <div className="hidden md:flex flex-col text-[10px] text-slate-400 font-medium">
                      <div className="flex items-center gap-1">
                        <span>On-Hand:</span>
                        <span className={`font-mono font-bold ${
                          item.On_Hand !== undefined && item.Par_Level !== undefined && item.On_Hand < item.Par_Level
                            ? "text-rose-600"
                            : "text-slate-600"
                        }`}>
                          {item.On_Hand ?? 0} {item.Unit_Type}
                        </span>
                      </div>
                      {item.Par_Level !== undefined && item.Par_Level > 0 && (
                        <span>Par: {item.Par_Level}</span>
                      )}
                    </div>

                    {/* Quick quantity input and Add call-to-action button */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="relative flex items-center bg-slate-50 rounded-lg border border-slate-200 p-0.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Qty"
                          value={currentDraftVal}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            setDraftQtys(prev => ({ ...prev, [item.Item_ID]: val }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const parsed = parseFloat(currentDraftVal);
                              if (!isNaN(parsed) && parsed > 0) {
                                handleQuantityAdjust(item.Item_ID, parsed);
                              }
                            }
                          }}
                          className="w-12 text-center text-xs font-mono font-bold bg-transparent border-0 focus:outline-none p-0.5 text-slate-800 placeholder:text-slate-400"
                        />
                        <span className="text-[9px] font-bold text-slate-400 font-sans pr-1">
                          {item.Unit_Type || "KG"}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          const parsed = parseFloat(currentDraftVal);
                          const qtyToSet = isNaN(parsed) ? (qtyInCart > 0 ? 0 : 1) : parsed;
                          handleQuantityAdjust(item.Item_ID, qtyToSet);
                          
                          // Feed feedback with clearing text after ordering
                          if (qtyToSet > 0) {
                            setDraftQtys(prev => ({ ...prev, [item.Item_ID]: String(qtyToSet) }));
                          } else {
                            setDraftQtys(prev => ({ ...prev, [item.Item_ID]: "" }));
                          }
                        }}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition active:scale-95 border ${
                          qtyInCart > 0
                            ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {qtyInCart > 0 ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Ordered ({qtyInCart})</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center font-sans text-xs text-slate-400 italic">
                No catalog matches found for "{inputValue}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
