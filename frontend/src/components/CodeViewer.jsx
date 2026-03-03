import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import FileTabs from "./FileTabs";

export default function CodeViewer({ files = [], loading, onCopySuccess }) {
  const [active, setActive] = useState("");
  const [copied, setCopied] = useState(false);

  const current = useMemo(() => {
    if (!files.length) return null;
    return files.find((f) => f.filename === active) || files[0];
  }, [files, active]);

  const lines = (current?.content || "").split("\n");

  const copy = async () => {
    if (!current) return;
    await navigator.clipboard.writeText(current.content || "");
    setCopied(true);
    onCopySuccess?.("Copied to clipboard");
    setTimeout(() => setCopied(false), 1200);
  };

  const download = () => {
    if (!current) return;
    const blob = new Blob([current.content || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = current.filename || "output.txt";
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
          <button onClick={copy} className="rounded-md border border-white/10 p-1.5 transition hover:bg-white/10">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button onClick={download} className="rounded-md border border-white/10 p-1.5 transition hover:bg-white/10">
            <Download size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(7)].map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-slate-700/60" />)}</div>
      ) : (
        <div className="max-h-[460px] overflow-auto rounded-xl border border-white/10 bg-[#111827] p-3 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-4 font-mono">
            <div className="select-none pr-2 text-right text-slate-500">{lines.map((_, idx) => <div key={idx}>{idx + 1}</div>)}</div>
            <pre className="whitespace-pre-wrap break-words text-slate-100">{current?.content || "No code available."}</pre>
          </div>
        </div>
      )}
    </section>
  );
}
