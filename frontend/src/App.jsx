import { useState, useEffect } from "react";
import axios from "axios";

export default function App() {

  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState("sql");

  const [files, setFiles] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const API = "http://127.0.0.1:8000";

  // ================= THEME =================
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  const toggleTheme = () => setDark(!dark);

  // ================= UPLOAD =================
  const uploadFiles = async () => {
    const formData = new FormData();
    for (let file of files) formData.append("files", file);

    const res = await axios.post(`${API}/upload`, formData);
    setSchemas(res.data.schemas || []);
  };

  // ================= GENERATE =================
  const generate = async () => {
    setLoading(true);

    const formData = new FormData();
    formData.append("question", question);

    const res = await axios.post(`${API}/generate-sql`, formData);
    setResponse(res.data);

    setLoading(false);
  };

  const copy = (text) => navigator.clipboard.writeText(text || "");

  // ================= TABLE =================
  const renderTable = () => {
    if (!response?.result || response.result.length === 0) return null;

    const data = response.result;
    const cols = Object.keys(data[0]);

    return (
      <table className="w-full text-sm mt-4 border">
        <thead className="bg-gray-200 dark:bg-gray-700">
          <tr>
            {cols.map(c => <th key={c} className="p-2 border">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {cols.map(c => <td key={c} className="p-2 border">{row[c]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // ================= UI =================
  return (
    <div className={`${dark ? "dark" : ""}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b bg-white dark:bg-gray-800">
          <h1 className="text-xl font-semibold">NL2SQL 🚀</h1>

          <button
            onClick={toggleTheme}
            className="border px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {dark ? "Light" : "Dark"}
          </button>
        </div>

        <div className="max-w-6xl mx-auto p-6 space-y-6">

          {/* Upload */}
          <div className="bg-white dark:bg-gray-800 border rounded p-4">
            <h2 className="font-semibold mb-2">Upload</h2>

            <div className="flex gap-2">
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="border p-2 w-full dark:bg-gray-700"
              />

              <button
                onClick={uploadFiles}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Upload
              </button>
            </div>

            {schemas.map((s, i) => (
              <div key={i} className="text-sm mt-2">{s}</div>
            ))}
          </div>

          {/* Question */}
          <div className="bg-white dark:bg-gray-800 border rounded p-4">
            <h2 className="font-semibold mb-2">Ask</h2>

            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="border p-2 w-full dark:bg-gray-700"
              />

              <button
                onClick={generate}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Generate
              </button>
            </div>

            {loading && <div className="text-sm mt-2">Generating...</div>}
          </div>

          {/* Result */}
          {response && (
            <div className="bg-white dark:bg-gray-800 border rounded">

              {/* Tabs */}
              <div className="flex border-b">
                {["sql", "python", "pyspark"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 ${
                      activeTab === tab
                        ? "border-b-2 border-blue-500 font-semibold"
                        : ""
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Code */}
              <div className="relative">

                <button
                  onClick={() => copy(response[activeTab])}
                  className="absolute top-2 right-2 border px-2 py-1 text-xs rounded"
                >
                  Copy
                </button>

                <pre className="p-4 text-sm overflow-auto bg-gray-100 dark:bg-gray-900">
                  {response[activeTab]}
                </pre>
              </div>

              {/* Warning */}
              {response.warning && (
                <div className="p-3 bg-yellow-100 text-yellow-900">
                  ⚠ {response.warning}
                </div>
              )}

              {/* Explanation */}
              <div className="p-4 border-t">
                <h3 className="font-semibold">Explanation</h3>
                <p className="text-sm mt-2">{response.explanation}</p>

                {renderTable()}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}