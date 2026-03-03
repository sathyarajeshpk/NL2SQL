const SUGGESTIONS = [
  "React login form",
  "Python scraper",
  "SQL analytics query",
  "Node.js REST API",
  "Fix my code bug",
];

export default function PromptInput({
  prompt,
  onPromptChange,
  onSubmit,
  loading,
  language,
  onLanguageChange,
  fixMode,
  onFixModeChange,
}) {
  return (
    <section className="glass-card p-5 md:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">Free • No Login Required</span>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-cyan-200">AI Developer Tool</span>
      </div>
      <h1 className="text-2xl font-semibold text-white">Convert Natural Language into Production-Ready Code</h1>
      <p className="mt-2 text-sm text-slate-300">Describe what you want to build. Get clean, runnable code instantly with AI.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <select value={language} onChange={(e) => onLanguageChange(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70">
          {[
            "Auto detect",
            "Python",
            "JavaScript",
            "TypeScript",
            "SQL",
            "Java",
            "C#",
            "Go",
          ].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
          <input type="checkbox" checked={fixMode} onChange={(e) => onFixModeChange(e.target.checked)} />
          Fix / Improve Existing Code
        </label>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        rows={6}
        placeholder={'Create a REST API in Node.js with authentication\nWrite a Python script to scrape product prices\nGenerate SQL to find top 10 customers by revenue'}
        className="mt-4 w-full rounded-2xl border border-white/15 bg-slate-900/70 p-4 text-sm text-slate-100 shadow-inner shadow-black/30 outline-none transition duration-300 placeholder:text-slate-500 focus:border-cyan-300/70 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((chip) => (
          <button key={chip} onClick={() => onPromptChange(chip)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:-translate-y-0.5 hover:border-cyan-300/50">
            {chip}
          </button>
        ))}
      </div>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="mt-5 inline-flex min-w-36 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-700/30 transition hover:scale-[1.01] hover:shadow-cyan-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Generating..." : "Generate Code"}
      </button>
    </section>
  );
}
