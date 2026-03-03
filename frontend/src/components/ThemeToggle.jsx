import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200 backdrop-blur transition hover:border-cyan-300/60 hover:bg-cyan-400/10"
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
      <span>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
