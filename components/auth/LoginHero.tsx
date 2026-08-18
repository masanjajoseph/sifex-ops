"use client";

import { useEffect, useRef, useState } from "react";
import type { Variants } from "framer-motion";
import { motion, useInView, animate } from "framer-motion";
import { Package, ArrowUpRight, Warehouse, Plane, ShieldCheck, DollarSign } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function AnimatedCounter({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 2000;
    let raf: number;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const current = value * progress;
      setDisplay(current.toFixed(decimals));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, decimals]);

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  );
}

const features = [
  { icon: ArrowUpRight, title: "Export Operations", description: "End-to-end export documentation, cargo booking, and consolidation" },
  { icon: Package, title: "Import Clearance", description: "Automated customs processing, duty calculation, and release" },
  { icon: Warehouse, title: "Warehouse Tracking", description: "Real-time inventory visibility, slot management, and routing" },
  { icon: Plane, title: "Flight Consolidation", description: "Master Air Waybill management with capacity optimization" },
  { icon: ShieldCheck, title: "Customs Processing", description: "Multi-jurisdiction compliance, document generation, and tracking" },
  { icon: DollarSign, title: "Multi-Currency Billing", description: "Automated invoicing, payment reconciliation, and credit control" },
];

const METRIC_KEYS = ["activeShipments", "flightsInTransit", "warehouseCapacity", "deliverySuccess"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

const defaultMetrics: Record<MetricKey, number> = {
  activeShipments: 0,
  flightsInTransit: 0,
  warehouseCapacity: 0,
  deliverySuccess: 0,
};

export function LoginHero() {
  const [metrics, setMetrics] = useState<Record<MetricKey, number>>(defaultMetrics);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/public/operations", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body) => {
        if (cancelled) return;
        const data = body?.data ?? body;
        setMetrics((prev) => ({
          activeShipments: data.activeShipments ?? prev.activeShipments,
          flightsInTransit: data.flightsInTransit ?? prev.flightsInTransit,
          warehouseCapacity: data.warehouseCapacity ?? prev.warehouseCapacity,
          deliverySuccess: data.deliverySuccess ?? prev.deliverySuccess,
        }));
      })
      .catch((err) => {
        if (!cancelled) console.error("[LoginHero] failed to load live operations", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const metricList: { label: string; value: number; suffix?: string; decimals?: number }[] = [
    { label: "Active Shipments", value: metrics.activeShipments },
    { label: "Flights In Transit", value: metrics.flightsInTransit },
    { label: "Warehouse Capacity", value: metrics.warehouseCapacity, suffix: "%" },
    { label: "Delivery Success", value: metrics.deliverySuccess, suffix: "%", decimals: 1 },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-12"
    >
      {/* Operational Highlights */}
      <motion.div variants={itemVariants} className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Operational Modules</p>
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-red-500/20 transition-all duration-300 cursor-default"
              >
                <Icon className="w-3.5 h-3.5 text-red-400/60 group-hover:text-red-400 mb-1.5 transition-colors" />
                <p className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">{f.title}</p>
                <p className="text-[10px] text-white/40 leading-relaxed mt-0.5 transition-colors">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Metrics */}
      <motion.div variants={itemVariants} className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Live Operations</p>
        <div className="grid grid-cols-4 gap-3">
          {metricList.map((m) => (
            <div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-lg font-bold text-white tabular-nums tracking-tight">
                <AnimatedCounter value={m.value} suffix={m.suffix} decimals={m.decimals} />
              </p>
              <p className="text-[10px] text-white/40 leading-tight mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
