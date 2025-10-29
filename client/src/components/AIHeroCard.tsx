import { motion } from "framer-motion";
import { Link } from "wouter";
import { Wand2, PenSquare } from "lucide-react";

type Props = {
  className?: string;
  onAIClick?: () => void;
  onBlankClick?: () => void;
};

export default function AIHeroCard({ className = "", onAIClick, onBlankClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-xl ${className}`}
    >
      {/* background accents */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:gap-5 max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15">
            <Wand2 className="h-5 w-5" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
            Design smarter surveys — powered by AI
          </h1>
        </div>

        <p className="text-white/90 text-sm sm:text-base">
          Tell us your topic. We'll generate a complete draft grouped by subtopics
          (3–4 questions per page) with clear page headings. Edit, tweak, ship.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Link
            href="/ai-survey"
            onClick={onAIClick}
            className="inline-flex items-center justify-center rounded-xl bg-white text-indigo-700 hover:bg-white/90 px-4 py-2.5 font-medium shadow-sm transition-colors"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Generate with AI
          </Link>

          <Link
            href="/surveys/new"
            onClick={onBlankClick}
            className="inline-flex items-center justify-center rounded-xl border border-white/30 text-white hover:bg-white/10 px-4 py-2.5 font-medium transition-colors"
          >
            <PenSquare className="mr-2 h-4 w-4" />
            Start Blank
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
