import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import FileTabs from "./FileTabs";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlight(content, lang = "text") {
  let code = escapeHtml(content);

  if (["python", "sql", "javascript", "typescript", "java", "go", "c#"].includes((lang || "").toLowerCase())) {
    code = code.replace(/(".*?"|'.*?')/g, '<span class="text-emerald-300">$1</span>');
    code = code.replace(/\b(function|const|let|var|return|if|else|for|while|class|import|from|def|select|where|group|order|by|join|insert|update|delete|public|private|async|await|package|interface)\b/gi, '<span class="text-violet-300">$1</span>');
    code = code.replace(/\b([0-9]+)\b/g, '<span class="text-amber-300">$1</span>');
    code = code.replace(/(#.*$|--.*$|\/\/.*$)/gm, '<span class="text-slate-500">$1</span>');
  }

  return code;
}

export default function CodeViewer({ files = [], loading, onCopySuccess }) {
  const [active, setActive] = useState(files[0]?.filename);
  const [displayed, setDisplayed] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!files.some((file) => file.filename === active)) setActive(files[0]?.filename);
  }, [files, active]);

  const current = files.find((f) => f.filename === active) || files[0];

  useEffect(() => {
    if (!current?.content) return;
    let i = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayed("");
    const content = current.content;
    const timer = setInterval(() => {
      i += Math.max(1, Math.floor(content.length / 80));
      setDisplayed(content.slice(0, i));
      if (i >= content.length) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [current?.filename, current?.content]);

  const highlighted = useMemo(() => (current ? highlight(displayed || "", current.language) : ""), [current, displayed]);
  const lines = (displayed || "").split("\n");

  const copy = async () => {
    if (!current) return;
    await navigator.clipboard.writeText(current.content);
    setCopied(true);
    onCopySuccess?.("Copied to clipboard");
    setTimeout(() => setCopied(false), 1200);
  };

  const download = () => {
    if (!current) return;
    const blob = new Blob([current.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = current.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="glass-card p-4">
      <FileTabs files={files} activeFile={current?.filename} onSelect={setActive} />
      <div className="mb-3 flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-100">{current?.filename || "output.txt"}</span>
          <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] uppercase text-violet-200">{current?.language || "text"}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={copy} className="rounded-md border border-white/10 p-1.5 hover:bg-white/10">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
          <button onClick={download} className="rounded-md border border-white/10 p-1.5 hover:bg-white/10"><Download size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-slate-700/60" />)}</div>
      ) : (
        <div className="max-h-[460px] overflow-auto rounded-xl border border-white/10 bg-[#111827] p-3 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-4 font-mono">
            <div className="select-none pr-2 text-right text-slate-500">{lines.map((_, idx) => <div key={idx}>{idx + 1}</div>)}</div>
            <pre className="relative whitespace-pre-wrap break-words text-slate-100"><code dangerouslySetInnerHTML={{ __html: highlighted }} />{displayed !== current?.content && <span className="blink-cursor">▋</span>}</pre>
          </div>
        </div>
      )}
    </section>
  );
}
