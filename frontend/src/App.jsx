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

```
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
    err.response?.data?.detail || "Upload failed. Please verify backend."
  );
} finally {
  setUploading(false);
}
```

};

const generate = async (q = question) => {
if (!q?.trim()) return;

```
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
```

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
return ( <div className="grid h-72 place-items-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
No data available for visualization </div>
);
}

```
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
        <XAxis dataKey={category} />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey={numeric}
          stroke="#4f46e5"
          strokeWidth={2.5}
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
      <Bar dataKey={numeric} fill="#4f46e5" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);
```

};

const renderTable = () => {
if (!response?.result?.length) return null;

```
const cols = Object.keys(response.result[0]);

return (
  <div className="mt-4 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-100/80 text-left dark:bg-gray-800/80">
        <tr>
          {cols.map((c) => (
            <th
              key={c}
              className="border-b border-gray-200 px-3 py-2 font-semibold dark:border-gray-700"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {response.result.map((row, i) => (
          <tr
            key={i}
            className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40"
          >
            {cols.map((c) => (
              <td
                key={c}
                className="border-b border-gray-200 px-3 py-2 dark:border-gray-700"
              >
                {String(row[c])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
```

};

return ( <div className="flex min-h-screen bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
{sidebarOpen && (
<button
onClick={() => setSidebarOpen(false)}
className="fixed inset-0 z-20 bg-black/40 lg:hidden"
/>
)}

```
  {/* Sidebar */}
  <aside
    className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-gray-200 bg-white p-5 transition-transform dark:border-gray-800 dark:bg-gray-900 lg:static ${
      sidebarOpen ? "translate-x-0" : "-translate-x-full"
    }`}
  >
    <div className="mb-4 rounded-xl bg-indigo-600/10 p-4 dark:bg-indigo-500/10">
      <h1 className="text-xl font-bold tracking-tight">NL2SQL 🚀</h1>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
        Natural language to SQL, Python, and PySpark.
      </p>
    </div>

    <button
      onClick={() => setDark(!dark)}
      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
    >
      {dark ? "Switch to Light" : "Switch to Dark"}
    </button>

    <div className="mt-5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        History
      </div>

      <HistoryList history={history} onSelect={generate} />
    </div>
  </aside>

  {/* Main */}
  <main className="flex flex-1 flex-col">
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
      <button
        onClick={() => setSidebarOpen(true)}
        className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 lg:hidden"
      >
        ☰
      </button>

      <h2 className="text-lg font-semibold">AI Data Assistant</h2>
    </header>

    {/* Upload */}
    <section className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
        />

        <button
          onClick={uploadFiles}
          disabled={uploading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {schemas.length > 0 && (
          <div className="text-xs text-indigo-600">
            {schemas.join(", ")}
          </div>
        )}
      </div>
    </section>

    {/* Body */}
    <section className="flex-1 overflow-auto p-4 lg:p-6">
      {response ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
            <div className="mb-3 flex gap-2">
              {codeTabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    tab === key
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 dark:bg-gray-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Editor
              height="320px"
              language={tab === "sql" ? "sql" : "python"}
              value={activeCode}
              theme={dark ? "vs-dark" : "light"}
              options={{ readOnly: true }}
            />

            {renderTable()}
          </div>

          <div className="rounded-2xl border bg-white p-5 dark:bg-gray-900">
            {renderChart()}
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-10 max-w-3xl text-center">
          <h2 className="text-xl font-semibold">
            Ask your data a question
          </h2>
          <div className="mt-6 grid gap-3">
            {starterPrompts.map((p) => (
              <button
                key={p}
                onClick={() => setQuestion(p)}
                className="rounded-lg border px-4 py-3"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>

    {/* Footer */}
    <footer className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-5xl gap-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about your data..."
          className="flex-1 rounded-xl border px-4 py-3"
          onKeyDown={(e) => e.key === "Enter" && generate()}
        />

        <button
          onClick={() => generate()}
          disabled={!canAsk || loading}
          className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white"
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>
    </footer>
  </main>
</div>
```

);
}
