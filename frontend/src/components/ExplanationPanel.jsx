import { useState } from "react";

export default function ExplanationPanel({ text }) {
  const [open, setOpen] = useState(true);

  if (!text) return null;

  return (
    <section className="glass-card mt-4 p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-100">
        <span>Explain this code</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{text}</p>}
    </section>
  );
}
