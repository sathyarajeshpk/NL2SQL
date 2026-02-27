import { useState, useEffect } from "react";
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

export default function App() {
  const API = import.meta.env.VITE_API_URL;

  const [dark, setDark] = useState(true);
  const [files, setFiles] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("sql");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const uploadFiles = async () => {
    const formData = new FormData();
    for (let f of files) formData.append("files", f);

    const res = await axios.post((API || "") + "/upload", formData);
    setSchemas(res.data.schemas || []);
  };

  const generate = async (q = question) => {
    if (!q) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("question", q);

      const res = await axios.post((API || "") + "/generate-sql", formData);

      setResponse(res.data || {});
      setHistory((prev) => [q, ...prev]);
      setQuestion("");
    } catch (err) {
      console.error(err);
      alert("Error generating query");
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (
      !response ||
      !response.result ||
      !Array.isArray(response.result) ||
      response.result.length === 0
    ) {
      return (
        <div className="grid h-72 place-items-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No data available for visualization
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
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <XAxis dataKey={category} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={numeric} stroke="#4f46e5" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <XAxis dataKey={category} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={numeric} fill="#4f46e5" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTable = () => {
    if (
      !response ||
      !response.result ||
      !Array.isArray(response.result) ||
      response.result.length === 0
    ) {
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
          <thead className="bg-gray-100/80 text-left dark:bg-gray-800/80">
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
              <tr key={i} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40">
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
    tab === "sql"
      ? response?.sql || ""
      : tab === "python"
      ? response?.python || ""
      : response?.pyspark || "";

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-gray-200 bg-white p-5 transition-transform dark:border-gray-800 dark:bg-gray-900 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 rounded-xl bg-indigo-600/10 p-4 dark:bg-indigo-500/10">
          <h1 className="text-xl font-bold tracking-tight">NL2SQL 🚀</h1>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Natural language to SQL, Python, and PySpark.</p>
        </div>

        <button
          onClick={() => setDark(!dark)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {dark ? "Switch to Light" : "Switch to Dark"}
        </button>

        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">History</div>

          <div className="space-y-2 overflow-auto pr-1" style={{ maxHeight: "calc(100vh - 230px)" }}>
            {history.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Your recent prompts will appear here.
              </p>
            )}
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  generate(h);
                  setSidebarOpen(false);
                }}
                className="w-full rounded-lg border border-transparent bg-gray-100 p-2 text-left text-xs transition hover:border-indigo-400 hover:bg-indigo-50 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col lg:ml-0">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 lg:hidden"
            >
              ☰
            </button>
            <h2 className="text-lg font-semibold">AI Data Assistant</h2>
          </div>
          <div className="hidden items-center gap-2 text-xs text-gray-500 md:flex">
            <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">Live</span>
            <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">Analytics Workspace</span>
          </div>
        </header>

        <section className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700 dark:border-gray-700 dark:bg-gray-900"
            />

            <button
              onClick={uploadFiles}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Upload
            </button>

            {schemas.length > 0 && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                {schemas.join(", ")}
              </div>
            )}
          </div>
        </section>

        <section className="flex-1 overflow-auto p-4 lg:p-6">
          {response ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-3 flex gap-2">
                  {[
                    ["sql", "SQL"],
                    ["python", "Python"],
                    ["pyspark", "PySpark"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        tab === key
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <Editor
                  height="320px"
                  language={tab === "sql" ? "sql" : "python"}
                  value={activeCode || ""}
                  theme={dark ? "vs-dark" : "light"}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    wordWrap: "on",
                    fontSize: 14,
                  }}
                />

                {response?.explanation && (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Explanation</div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{response.explanation}</div>
                  </div>
                )}

                {renderTable()}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Visualization</div>
                {renderChart()}
              </div>
            </div>
          ) : (
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-dashed border-indigo-300 bg-white p-8 text-center shadow-sm dark:border-indigo-800 dark:bg-gray-900">
              <h2 className="text-xl font-semibold">Ask your data a question</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Upload one or more files, then type a question below to generate SQL and insights.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
                {[
                  "Total sales by month",
                  "Top customers by spend",
                  "Weekly retention trend",
                ].map((tip) => (
                  <div key={tip} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-800/50">
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="sticky bottom-0 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-5xl gap-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about your data..."
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-900 dark:focus:ring-indigo-900"
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />

            <button
              onClick={() => generate()}
              className="min-w-24 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
