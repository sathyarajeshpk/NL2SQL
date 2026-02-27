import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import HistoryList from "./components/HistoryList";
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
      setError(
        err.response?.data?.detail ||
          "Upload failed. Please verify backend."
      );
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
      setHistory((prev) =>
        [q, ...prev.filter((item) => item !== q)].slice(0, 20)
      );

      setQuestion("");
      setSidebarOpen(false);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Error generating query. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const activeCode =
    tab === "sql"
      ? response?.sql || ""
      : tab === "python"
      ? response?.python || ""
      : response?.pyspark || "";

  const canAsk = useMemo(() => Boolean(schemas.length), [schemas]);

  const renderChart = () => {
    if (!response?.result?.length) {
      return (
        <div className="grid h-72 place-items-center text-sm text-gray-500">
          No chartable data
        </div>
      );
    }

    const data = response.result;
    const keys = Object.keys(data[0]);
    if (keys.length < 2) return null;

    const numeric = keys.find((k) => typeof data[0][k] === "number");
    const category = keys.find((k) => k !== numeric);

    if (!numeric || !category) return null;

    const isDate = !isNaN(Date.parse(data[0][category]));

    if (isDate) {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <XAxis dataKey={category} />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={numeric}
              stroke="#0ea5e9"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <XAxis dataKey={category} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={numeric} fill="#0ea5e9" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderTable = () => {
    if (!response?.result?.length) return null;

    const cols = Object.keys(response.result[0]);

    return (
      <div className="mt-4 overflow-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 border-b">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {response.result.map((row, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c} className="px-3 py-2 border-b">
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

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-white dark:bg-slate-900 p-4 transition-transform lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="font-semibold">NL2SQL Assistant</div>
            <div className="text-xs text-gray-500">
              Data Copilot Dashboard
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            ✕
          </button>
        </div>

        <button
          onClick={() => {
            setResponse(null);
            setQuestion("");
          }}
          className="w-full mb-3 bg-sky-500 text-white rounded-lg py-2"
        >
          + New analysis
        </button>

        <button
          onClick={() => setDark((d) => !d)}
          className="w-full mb-4 border rounded-lg py-2"
        >
          {dark ? "Light mode" : "Dark mode"}
        </button>

        <div className="text-xs font-semibold mb-2">
          Recent prompts
        </div>

        <HistoryList history={history} onSelect={generate} />
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col">
        <header className="flex justify-between items-center border-b p-4 bg-white dark:bg-slate-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            ☰
          </button>

          <div className="font-semibold">
            Data Analyst Workspace
          </div>
        </header>

        {/* Upload */}
        <section className="border-b p-4 bg-white dark:bg-slate-900">
          <div className="flex gap-3 flex-wrap">
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />

            <button
              onClick={uploadFiles}
              disabled={uploading}
              className="bg-sky-500 text-white px-4 py-2 rounded-lg"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>

            <div className="text-sm text-gray-500">
              {schemas.length
                ? `${schemas.length} table(s) ready`
                : "Upload CSV/XLSX/TSV"}
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="flex-1 overflow-auto p-4">
          {!response ? (
            <div className="max-w-3xl mx-auto text-center mt-10">
              <h2 className="text-2xl font-bold">
                How can I help with your data today?
              </h2>

              <div className="grid gap-3 mt-6">
                {starterPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setQuestion(p)}
                    className="border rounded-lg px-4 py-3"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Code */}
              <div>
                <div className="flex gap-2 mb-2">
                  {codeTabs.map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`px-3 py-1 rounded ${
                        tab === key
                          ? "bg-sky-500 text-white"
                          : "border"
                      }`}
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
                  options={{ readOnly: true }}
                />
              </div>

              {renderChart()}
              {renderTable()}
            </div>
          )}

          {error && (
            <div className="mt-4 text-red-600">{error}</div>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t p-3 bg-white dark:bg-slate-900">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder={
                canAsk
                  ? "Ask anything..."
                  : "Upload files first"
              }
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />

            <button
              onClick={() => generate()}
              disabled={!canAsk || loading}
              className="bg-sky-500 text-white px-5 rounded-lg"
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}