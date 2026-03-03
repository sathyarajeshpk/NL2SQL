import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import PromptInput from "../components/PromptInput";
import CodeViewer from "../components/CodeViewer";
import ExplanationPanel from "../components/ExplanationPanel";

function normalizeFiles(data) {
  if (Array.isArray(data?.files) && data.files.length) return data.files;

  const files = [];
  if (data?.sql) files.push({ filename: "query.sql", language: "sql", content: data.sql });
  if (data?.python) files.push({ filename: "main.py", language: "python", content: data.python });
  if (data?.pyspark) files.push({ filename: "pipeline.py", language: "python", content: data.pyspark });
  return files;
}

export default function Home() {
  const API = import.meta.env.VITE_API_URL || "";
  const [dark, setDark] = useState(true);
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("Auto detect");
  const [fixMode, setFixMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [toast, setToast] = useState("");
  const [codeTab, setCodeTab] = useState("sql");

  useEffect(() => {
    const initialDark = document.documentElement.classList.contains("dark");
    setDark(initialDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("nl2code-theme", dark ? "dark" : "light");
  }, [dark]);

  const outputFiles = useMemo(() => normalizeFiles(response), [response]);

  const classicTabs = useMemo(
    () => [
      { key: "sql", label: "SQL", files: [{ filename: "query.sql", language: "sql", content: response?.sql || "" }] },
      { key: "python", label: "Python", files: [{ filename: "main.py", language: "python", content: response?.python || "" }] },
      { key: "pyspark", label: "PySpark", files: [{ filename: "pipeline.py", language: "python", content: response?.pyspark || "" }] },
      { key: "files", label: "Multi-file", files: outputFiles },
    ],
    [response?.sql, response?.python, response?.pyspark, outputFiles]
  );

  const activeView = classicTabs.find((tab) => tab.key === codeTab) || classicTabs[0];

  const uploadFiles = async () => {
    if (!filesToUpload.length) return;
    const form = new FormData();
    for (const file of filesToUpload) form.append("files", file);
    const res = await axios.post(`${API}/upload`, form);
    setSchemas(res.data.schemas || []);
    setToast("Files uploaded");
    setTimeout(() => setToast(""), 1400);
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("question", prompt);
      form.append("language", language);
      form.append("mode", fixMode ? "fix" : "generate");
      const res = await axios.post(`${API}/generate-sql`, form);
      setResponse(res.data || {});
      setCodeTab("sql");
      if (res.data?.error) {
        setToast(res.data.error);
      }
    } catch {
      setToast("Failed to generate code.");
    } finally {
      setLoading(false);
      setTimeout(() => setToast(""), 1800);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F19] text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.25),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(56,189,248,0.2),transparent_35%)]" />
      <Navbar dark={dark} onToggleTheme={() => setDark((d) => !d)} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <section className="glass-card mb-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              multiple
              onChange={(e) => setFilesToUpload(Array.from(e.target.files || []))}
              className="rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-xs"
            />
            <button onClick={uploadFiles} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs hover:bg-white/20">
              Upload Datasets
            </button>
            {schemas.length > 0 && <p className="text-xs text-cyan-200">{schemas.join(", ")}</p>}
          </div>
        </section>

        <PromptInput
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={generate}
          loading={loading}
          language={language}
          onLanguageChange={setLanguage}
          fixMode={fixMode}
          onFixModeChange={setFixMode}
        />

        {response && (
          <section className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {classicTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCodeTab(tab.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    codeTab === tab.key ? "bg-cyan-500/25 text-cyan-100" : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <CodeViewer key={`${codeTab}-${activeView.files.map((f) => f.filename).join("|")}`} files={activeView.files} loading={loading} onCopySuccess={setToast} />
          </section>
        )}

        <ExplanationPanel text={response?.explanation} />

        <footer className="mt-8 border-t border-white/10 py-4 text-xs text-slate-400">Built with care for Indian SaaS builders • Creator: NL2Code Team</footer>
      </main>

      {toast && <div className="fixed bottom-6 right-6 rounded-lg border border-emerald-300/30 bg-emerald-400/15 px-4 py-2 text-xs text-emerald-100">{toast}</div>}
    </div>
  );
}
