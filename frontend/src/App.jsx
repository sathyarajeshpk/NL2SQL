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
      for (let f of files) formData.append("files", f);

      const res = await axios.post(`${API}/upload`, formData);
      setSchemas(res.data.schemas || []);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please verify your files and backend status.");
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
      if (res.data?.error) {
        setError(res.data.error);
        return;
      }

      setResponse(res.data || {});
      setHistory((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 20));
      setQuestion("");
      setSidebarOpen(false);
    } catch (err) {
      console.error(err);
      setError("Error generating query. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!response?.result || !Array.isArray(response.result) || response.result.length === 0) {
      return (
        <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
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
        <ResponsiveContainer width="100%" height={290}>
          <LineChart data={data}>
            <XAxis dataKey={category} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={numeric} stroke="#10a37f" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data}>
          <XAxis dataKey={category} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={numeric} fill="#10a37f" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTable = () => {
    if (!response?.result || !Array.isArray(response.result) || response.result.length === 0) {
      return (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No table data returned
        </div>
      );
    }

    const cols = Object.keys(response.result[0]);

    return (
      <div className="mt-4 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left dark:bg-gray-800">
            <tr>
              {cols.map((c) => (
                <th key={c} className="border-b border-gray-200 px-3 py-2 font-semibold dark:border-gray-700">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {response.result.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/30">
                {cols.map((c) => (
                  <td key={c} className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
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
    <div className="flex min-h-screen bg-[#ececf1] text-gray-900 dark:bg-[#202123] dark:text-gray-100">
      {sidebarOpen && <button onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 bg-black/50 lg:hidden" aria-label="Close sidebar" />}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-gray-200 bg-[#f7f7f8] p-4 transition-transform dark:border-gray-800 dark:bg-[#171717] lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => {
            setResponse(null);
            setQuestion("");
          }}
          className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:border-gray-700 dark:bg-[#2a2b32] dark:hover:bg-[#343541]"
        >
          + New chat
        </button>

        <div className="mb-4 rounded-lg bg-white p-3 dark:bg-[#2a2b32]">
          <div className="text-sm font-semibold">NL2SQL Assistant</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Upload data and ask natural language questions.</div>
        </div>

        <button
          onClick={() => setDark((prev) => !prev)}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          {dark ? "Light mode" : "Dark mode"}
        </button>

        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent prompts</div>
        <div className="mt-2 space-y-2 overflow-auto pr-1" style={{ maxHeight: "calc(100vh - 270px)" }}>
          {history.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 p-2 text-xs text-gray-500 dark:border-gray-700">No history yet.</div>}
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => generate(h)}
              className="w-full rounded-md bg-white p-2 text-left text-xs hover:bg-gray-100 dark:bg-[#2a2b32] dark:hover:bg-[#343541]"
            >
              {h}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#202123] lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-md border border-gray-300 px-2 py-1 lg:hidden dark:border-gray-700">☰</button>
            <div className="font-semibold">Data Analyst Workspace</div>
          </div>
          <div className="hidden text-xs text-gray-500 md:block">Model-driven SQL / Python / PySpark</div>
        </header>

        <section className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#202123] lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="max-w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#2a2b32]"
            />
            <button
              onClick={uploadFiles}
              disabled={uploading || !files?.length}
              className="rounded-md bg-[#10a37f] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <div className="text-xs text-gray-500 dark:text-gray-400">{schemas.length ? `${schemas.length} table(s) ready` : "Upload CSV/XLSX/TSV to start"}</div>
          </div>
          {schemas.length > 0 && <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">Schema: {schemas.join(" • ")}</div>}
        </section>

        <section className="flex-1 overflow-auto p-4 pb-28 lg:p-6">
          {!response ? (
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-[#2a2b32]">
              <h1 className="text-2xl font-bold">How can I help with your data today?</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Ask a business question and I’ll generate SQL, Python, PySpark and visualized results.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#2a2b32]">
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Assistant output</div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {codeTabs.map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setTab(key)}
                          className={`rounded-md px-3 py-1 text-xs font-semibold ${tab === key ? "bg-[#10a37f] text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <Editor
                      height="280px"
                      language={tab === "sql" ? "sql" : "python"}
                      value={activeCode}
                      theme={dark ? "vs-dark" : "light"}
                      options={{ readOnly: true, minimap: { enabled: false }, wordWrap: "on", fontSize: 13 }}
                    />
                    {response?.explanation && (
                      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/60">
                        {response.explanation}
                      </div>
                    )}
                    {renderTable()}
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">{renderChart()}</div>
                </div>
              </div>
            </div>
          )}

          {error && <div className="mx-auto mt-4 max-w-3xl rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        </section>

        <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-[#202123] lg:left-72">
          <div className="mx-auto flex max-w-4xl gap-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={canAsk ? "Ask anything about your dataset..." : "Upload files first to start asking questions"}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-[#2a2b32]"
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />
            <button
              onClick={() => generate()}
              disabled={loading || !canAsk}
              className="rounded-xl bg-[#10a37f] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
