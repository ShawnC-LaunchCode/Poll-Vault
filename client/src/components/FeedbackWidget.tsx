import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const triggerConfetti = useCallback(() => {
    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 80 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6"],
      });
    }, 250);
  }, []);

  useEffect(() => {
    if (submitted) {
      triggerConfetti();
      const t = setTimeout(() => setSubmitted(false), 4000);
      return () => clearTimeout(t);
    }
  }, [submitted, triggerConfetti]);

  // Listen for postMessage from iframe if survey sends completion event
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === "surveySubmitted") {
        setOpen(false);
        setSubmitted(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              aria-label="Give Feedback"
              className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform focus:outline-none focus:ring-4 focus:ring-indigo-300"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </DialogTrigger>

          <DialogContent
            className="max-w-lg w-[90vw] h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 p-0"
          >
            <iframe
              src={
                import.meta.env.DEV
                  ? "http://localhost:5000/survey/b121d194-29b2-48d2-a2b0-7f50504bc3d8"
                  : "https://poll-vault-production.up.railway.app/survey/b121d194-29b2-48d2-a2b0-7f50504bc3d8"
              }
              className="w-full h-full"
              title="Feedback Survey"
            />
          </DialogContent>
        </Dialog>
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-lg shadow-lg z-50 text-sm font-medium"
          >
            🎉 Thanks for your feedback!
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
