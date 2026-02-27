import { useState, useEffect } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import { format } from "sql-formatter";
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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // ---------------- UPLOAD ----------------
  const uploadFiles = async () => {
    const formData = new FormData();
    for (let f of files) formData.append("files", f);

    const res = await axios.post(`${API}/upload`, formData);
    setSchemas(res.data.schemas || []);
  };

  // ---------------- GENERATE ----------------
  const generate = async (q = question) => {
    if (!q) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("question", q);

      const res = await axios.post(`${API}/generate-sql`, formData);

      console.log("API:", res.data);

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

  // ---------------- CHART ----------------
  const renderChart = () => {
    if (
      !response ||
      !response.result ||
      !Array.isArray(response.result) ||
      response.result.length === 0
    ) {
      return (
        <div className="text-sm text-gray-500">
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
            <Line type="monotone" dataKey={numeric} stroke="#6366f1" />
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
          <Bar dataKey={numeric} fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ---------------- TABLE ----------------
  const renderTable = () => {
    if (
      !response ||
      !response.result ||
      !Array.isArray(response.result) ||
      response.result.length === 0
    ) {
      return (
        <div className="text-sm text-gray-500 mt-4">
          No table data returned
        </div>
      );
    }

    const cols = Object.keys(response.result[0]);

    return (
      <div className="mt-4 overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              {cols.map((c) => (
                <th key={c} className="p-2 border">
                  {c}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {response.result.map((row, i) => (
              <tr key={i} className="border-t">
                {cols.map((c) => (
                  <td key={c} className="p-2 border">
                    {row[c]}
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
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100">

      {/* SIDEBAR */}
      <div className="w-64 border-r p-4 bg-white dark:bg-gray-900 space-y-4">

        <div className="font-bold text-lg">NL2SQL 🚀</div>

        <button
          onClick={() => setDark(!dark)}
          className="w-full border rounded px-3 py-2"
        >
          {dark ? "Light Mode" : "Dark Mode"}
        </button>

        <div>
          <div className="text-sm font-semibold mb-2">History</div>

          <div className="space-y-2 max-h-[70vh] overflow-auto">
            {history.map((h, i) => (
              <div
                key={i}
                onClick={() => generate(h)}
                className="text-xs p-2 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                {h}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <div className="p-4 border-b bg-white dark:bg-gray-900 font-semibold">
          AI Data Assistant
        </div>

        {/* UPLOAD */}
        <div className="p-4 border-b bg-white dark:bg-gray-900 flex items-center gap-4">

          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="border rounded px-3 py-2"
          />

          <button
            onClick={uploadFiles}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Upload
          </button>

          {schemas.length > 0 && (
            <div className="text-xs text-gray-500">
              {schemas.join(", ")}
            </div>
          )}

        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-6 space-y-6">

          {response && (
            <div className="grid grid-cols-2 gap-6">

              {/* CODE */}
              <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow">

                <div className="flex gap-2 mb-3">
                  {["sql", "python", "pyspark"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1 rounded ${
                        tab === t
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-200 dark:bg-gray-800"
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>

                <Editor
  height="300px"
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

                {/* Explanation */}
                {response?.explanation && (
                  <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border">
                    <div className="text-xs font-semibold text-gray-500 mb-2">
                      Explanation
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {response.explanation}
                    </div>
                  </div>
                )}

                {renderTable()}

              </div>

              {/* CHART */}
              <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow">
                {renderChart()}
              </div>

            </div>
          )}

        </div>

        {/* INPUT */}
        <div className="p-4 border-t bg-white dark:bg-gray-900">

          <div className="max-w-4xl mx-auto flex gap-3">

            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about your data..."
              className="flex-1 px-4 py-3 rounded-xl border"
              onKeyDown={(e) => e.key === "Enter" && generate()}
            />

            <button
              onClick={() => generate()}
              className="px-4 py-3 bg-indigo-600 text-white rounded-xl"
            >
              {loading ? "..." : "Send"}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}