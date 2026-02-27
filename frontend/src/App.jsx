import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const codeTabs = [
  ["sql", "SQL"],
  ["python", "Python"],
  ["pyspark", "PySpark"],
];

const starterPrompts = [
  "Show monthly revenue trend for 2024",
  "Top 10 customers by total spend",
  "Compare sales by region and category",
  "Weekly active users with moving average",
];

const panel =
  "rounded-3xl border border-white/60 bg-white/75 shadow-2xl shadow-slate-300/40 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70 dark:shadow-black/30";

export default function App() {
  const API = import.meta.env.VITE_API_URL;

  const [dark, setDark] = useState(true);
  const [files, setFiles] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("sql");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const uploadFiles = async () => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      for (const f of files) formData.append("files", f);

      const res = await axios.post(`${API}/upload`, formData);
      setSchemas(res.data.schemas || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Upload failed. Please verify files and backend status.");
    } finally {
      setUploading(false);
    }
  };

  const generate = async (q = question) => {
    if (!q?.trim()) return;

    try {
      setLoading(true);
      setError("");
      const formData = new FormData();
      formData.append("question", q);

      const res = await axios.post(`${API}/generate-sql`, formData);

      setResponse(res.data || {});
      setHistory((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 20));
      setQuestion("");
      setSidebarOpen(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Error generating query. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!response?.result || !Array.isArray(response.result) || response.result.length === 0) {
      return (
        <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-slate-300/80 bg-white/30 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
          No chartable data yet
        </div>
      );
    }

    const data = response.result;
    const keys = Object.keys(data[0] || {});
    if (keys.length < 2) return null;

    const numeric = keys.find((k) => typeof data[0][k] === "number");
    const category = keys.find((k) => k !== numeric);

    if (!numeric || !category) return null;

    const isDate = !isNaN(Date.parse(data[0][category]));

    if (isDate) {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <XAxis dataKey={category} stroke={dark ? "#94a3b8" : "#475569"} />
            <YAxis stroke={dark ? "#94a3b8" : "#475569"} />
            <Tooltip />
            <Line type="monotone" dataKey={numeric} stroke="#2563eb" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <XAxis dataKey={category} stroke={dark ? "#94a3b8" : "#475569"} />
          <YAxis stroke={dark ? "#94a3b8" : "#475569"} />
          <Tooltip />
          <Bar dataKey={numeric} fill="#2563eb" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTable = () => {
    if (!response?.result || !Array.isArray(response.result) || response.result.length === 0) {
      return (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          No table data returned
        </div>
      );
    }

    const cols = Object.keys(response.result[0]);

    return (
      <div className="mt-4 overflow-auto rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100/90 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              {cols.map((c) => (
                <th key={c} className="border-b border-slate-200 px-4 py-2.5 font-semibold dark:border-slate-700">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {response.result.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900/35 dark:even:bg-slate-800/30">
                {cols.map((c) => (
                  <td key={c} className="border-b border-slate-200 px-4 py-2.5 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                    {String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const activeCode =
    tab === "sql" ? response?.sql || "" : tab === "python" ? response?.python || "" : response?.pyspark || "";

  const canAsk = useMemo(() => Boolean(schemas.length), [schemas]);

  return (
    <div className="relative flex min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-20 h-64 w-64 rounded-full bg-blue-300/35 blur-3xl dark:bg-blue-900/30" />
        <div className="absolute right-12 top-20 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-900/25" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-900/20" />
      </div>

      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[2px] lg:hidden"
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[320px] flex-col border-r border-white/40 bg-white/70 p-4 shadow-2xl backdrop-blur-2xl transition-transform duration-300 dark:border-slate-700/80 dark:bg-slate-900/80 lg:static lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">AI Workspace</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">NL2SQL Copilot</h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">World-class analytics experience</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 lg:hidden"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        <button
          onClick={() => {
            setResponse(null);
            setQuestion("");
            setError("");
          }}
          className="mb-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-indigo-500"
        >
          + New analysis
        </button>

        <button
          onClick={() => setDark((prev) => !prev)}
          className="mb-4 rounded-2xl border border-slate-300 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {dark ? "Switch to light mode" : "Switch to dark mode"}
        </button>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Recent prompts</p>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {history.length}
          </span>
        </div>

        <div className="space-y-2 overflow-auto pr-1" style={{ maxHeight: "calc(100vh - 255px)" }}>
          {history.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
              No history yet. Ask your first question.
            </div>
          )}
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => generate(h)}
              className="w-full rounded-2xl border border-transparent bg-white/90 p-3 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-white dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
            >
              {h}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200/70 bg-white/55 px-4 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/45 lg:px-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 lg:hidden"
                aria-label="Open sidebar"
              >
                ☰
              </button>
              <div>
                <h2 className="bg-gradient-to-r from-slate-900 via-blue-700 to-indigo-600 bg-clip-text text-xl font-semibold tracking-tight text-transparent dark:from-slate-100 dark:via-blue-300 dark:to-indigo-300">
                  Data Analyst Workspace
                </h2>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Design-grade interface with fast SQL/Python generation</p>
              </div>
            </div>
            <div className="hidden rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 md:block">
              Model-driven insights
            </div>
          </div>
        </header>

        <section className="px-4 pb-4 pt-5 lg:px-7">
          <div className={`${panel} p-4`}>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="max-w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm transition focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
              <button
                onClick={uploadFiles}
                disabled={uploading || !files?.length}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Upload files"}
              </button>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {schemas.length ? `${schemas.length} table(s) ready` : "Upload CSV/XLSX/TSV to begin"}
              </div>
            </div>
            {schemas.length > 0 && (
              <div className="mt-3 text-xs text-slate-700 dark:text-slate-300">Schema: {schemas.join(" • ")}</div>
            )}
          </div>
        </section>

        <section className="flex-1 overflow-auto px-4 pb-4 lg:px-7">
          {!response ? (
            <div className={`${panel} mx-auto mt-4 max-w-5xl p-8`}>
              <h3 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">How can I help with your data today?</h3>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600 dark:text-slate-300">
                Ask a business question and get production-ready SQL, Python, and PySpark with instant chart and table output.
              </p>
              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {starterPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setQuestion(p)}
                    className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`${panel} p-4`}>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Assistant output</div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {codeTabs.map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setTab(key)}
                          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                            tab === key
                              ? "bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/30"
                              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
                      <Editor
                        height="320px"
                        language={tab === "sql" ? "sql" : "python"}
                        value={activeCode}
                        theme={dark ? "vs-dark" : "light"}
                        options={{ readOnly: true, minimap: { enabled: false }, wordWrap: "on", fontSize: 13 }}
                      />
                    </div>
                    {response?.explanation && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                        {response.explanation}
                      </div>
                    )}
                    {renderTable()}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/30">
                    {renderChart()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
        </section>

        <footer className="border-t border-slate-200/70 bg-white/55 p-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/45 lg:px-7">
          <div className="mx-auto flex max-w-5xl gap-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={canAsk ? "Ask anything about your dataset..." : "Upload files first to start asking questions"}
              className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
            <button
              onClick={() => generate()}
              disabled={loading || !canAsk}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
