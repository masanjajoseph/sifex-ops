"use client";

import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export function LoginHero() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-lg space-y-5"
    >
      <motion.div variants={itemVariants} className="w-fit">
        <Logo size="lg" priority container />
      </motion.div>

      <motion.h1
        variants={itemVariants}
        className="text-3xl lg:text-4xl font-semibold leading-tight text-white"
      >
        Air Cargo Operations,
        <br />
        End to End.
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="text-sm leading-relaxed text-white/70"
      >
        Export documentation, import clearance, warehouse tracking, flight
        consolidation, customs and billing — managed from one secure platform.
      </motion.p>
    </motion.div>
  );
}
