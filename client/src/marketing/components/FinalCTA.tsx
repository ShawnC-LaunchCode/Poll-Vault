import { motion } from "framer-motion";
import { Link } from "wouter";
import { Wand2, Play } from "lucide-react";
import { brand } from "../lib/brand";

export default function FinalCTA() {
  return (
    <section className={`${brand.sectionPad} py-14 sm:py-16 ${brand.gradient} text-white`}>
      <div className={`${brand.maxw} text-center`}>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-3xl sm:text-4xl font-semibold"
        >
          Start creating with AI — free today.
        </motion.h2>
        <p className="mt-2 text-white/90">No credit card required · Secure data storage</p>
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/ai-survey"
            className="inline-flex items-center justify-center rounded-xl bg-white text-indigo-700 hover:bg-white/90 px-4 py-2.5 font-medium transition"
          >
            <Wand2 className="h-5 w-5 mr-2" /> Generate with AI
          </Link>
          <Link
            href="/survey/demo"
            className="inline-flex items-center justify-center rounded-xl border border-white/40 hover:bg-white/10 px-4 py-2.5 font-medium transition"
          >
            <Play className="h-5 w-5 mr-2" /> View Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
