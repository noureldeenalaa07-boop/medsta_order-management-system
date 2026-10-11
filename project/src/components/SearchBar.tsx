import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { Order } from "../lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "../lib/types";
import { Search, X, Package } from "lucide-react";

interface SearchBarProps {
  onSelectOrder: (order: Order) => void;
}

export default function SearchBar({ onSelectOrder }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Order[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .ilike("order_number::text", `%${query.trim()}%`)
        .order("order_number", { ascending: false })
        .limit(8);

      setResults((data as Order[]) || []);
      setLoading(false);
    }, 200);

    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search by order number..."
          className="w-full bg-navy-800/50 border border-navy-600/50 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-navy-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showResults && query.trim().length >= 1 && (
        <div className="absolute top-full mt-2 w-full glass-card shadow-2xl overflow-hidden animate-slide-up z-50">
          {loading ? (
            <div className="p-4 text-center text-navy-400 text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-navy-400 text-sm">No results found</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    onSelectOrder(order);
                    setShowResults(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-navy-700/50 transition-colors text-left border-b border-navy-700/30 last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">#{order.order_number}</span>
                      <span className="text-navy-400 text-xs">{order.order_date}</span>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {order.order_statuses.map((s) => (
                        <span
                          key={s}
                          className={`status-badge ${STATUS_COLORS[s]?.bg || ""} ${STATUS_COLORS[s]?.text || ""}`}
                        >
                          {STATUS_LABELS[s] || s}
                        </span>
                      ))}
                      {order.is_closed && (
                        <span className="status-badge bg-navy-500/20 text-navy-300">Closed</span>
                      )}
                      {order.is_cancelled && (
                        <span className="status-badge bg-red-500/15 text-red-400">Cancelled</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
