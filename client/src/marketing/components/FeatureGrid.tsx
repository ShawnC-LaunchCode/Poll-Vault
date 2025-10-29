import { motion } from "framer-motion";
import { brand } from "../lib/brand";
import { Wand2, BarChart3, Repeat2, Users, HardDriveDownload } from "lucide-react";

const cards = [
  { icon: Wand2, title: "AI Survey Creator", tag: "Describe → Generate", body: "Topic-grouped pages auto-built for you." },
  { icon: BarChart3, title: "Analytics & Insights", tag: "See what matters", body: "Visualize completion and trends instantly." },
  { icon: Repeat2, title: "Smart Follow-Ups", tag: "Engage respondents", body: "Send reminders or spin-off surveys in one click." },
  { icon: Users, title: "Collaboration & Sharing", tag: "Work together", body: "Invite teammates, manage recipients." },
  { icon: HardDriveDownload, title: "Data You Own", tag: "Export any time", body: "CSV/PDF, integration-ready APIs." }
];

export default function FeatureGrid() {
  return (
    <section className={`${brand.sectionPad} py-12 sm:py-16 bg-slate-50`}>
      <div className={`${brand.maxw}`}>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-6">Do more with every survey</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ icon: Icon, title, tag, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className={`${brand.card} p-5 hover:shadow-md transition`}
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-medium">{title}</div>
              <div className="text-xs text-indigo-700 mt-0.5">{tag}</div>
              <div className="text-sm text-gray-600 mt-1">{body}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
