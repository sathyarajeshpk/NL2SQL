import ThemeToggle from "./ThemeToggle";
import { Github, MessageSquare } from "lucide-react";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-violet-600/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 8h8M8 12h5M8 16h8" strokeLinecap="round" />
          <path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold tracking-wide text-white">NL2Code</div>
        <div className="text-[11px] text-slate-400">Powered by AI</div>
      </div>
    </div>
  );
}

export default function Navbar({ dark, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <Logo />
        <div className="flex items-center gap-2">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-white/40">
            <Github size={14} /> GitHub
          </a>
          <button className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-white/40">
            <MessageSquare size={14} /> Feedback
          </button>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
      </nav>
    </header>
  );
}
