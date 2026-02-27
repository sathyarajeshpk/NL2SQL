export default function HistoryList({ history, onSelect }) {
  if (!history.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
        No history yet. Ask your first question.
      </div>
    );
  }

  return history.map((item, index) => (
    <button
      key={`${item}-${index}`}
      onClick={() => onSelect(item)}
      className="w-full rounded-2xl border border-transparent bg-white/90 p-3 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-white dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
    >
      {item}
    </button>
  ));
}
