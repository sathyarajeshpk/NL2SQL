export default function FileTabs({ files, activeFile, onSelect }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2 border-b border-white/10 pb-3">
      {files.map((file) => (
        <button
          key={file.filename}
          onClick={() => onSelect(file.filename)}
          className={`rounded-lg px-3 py-1.5 text-xs transition ${
            activeFile === file.filename
              ? "bg-cyan-500/20 text-cyan-100"
              : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          {file.filename}
        </button>
      ))}
    </div>
  );
}
