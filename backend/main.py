from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import pandas as pd
import io
import os
import sqlite3
import json
import re
from openai import OpenAI

app = FastAPI()

# ================= CONFIG =================

DB_PATH = "/tmp/data.db"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    print("WARNING: OPENAI_API_KEY not set")

client = OpenAI(
    api_key=OPENAI_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)

# ================= CORS =================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= HEALTH =================

@app.get("/")
def root():
    return {"status": "NL2SQL API running"}

@app.get("/health")
def health():
    return {"ok": True}

# ================= STORAGE =================

schemas_global = []

def get_conn():
    return sqlite3.connect(DB_PATH)

# ================= UPLOAD =================

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    global schemas_global

    schemas_global = []

    conn = get_conn()

    for file in files:
        content = await file.read()

        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif file.filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content))
        elif file.filename.endswith(".tsv"):
            df = pd.read_csv(io.BytesIO(content), sep="\t")
        else:
            continue

        table_name = file.filename.split(".")[0]

        df.to_sql(table_name, conn, index=False, if_exists="replace")

        columns = ", ".join(df.columns)
        schemas_global.append(f"{table_name}({columns})")

    conn.close()

    return {
        "message": "Files uploaded",
        "schemas": schemas_global
    }

# ================= EXECUTE SQL =================

def execute_sql(sql: str):
    conn = get_conn()

    try:
        df = pd.read_sql_query(sql, conn)
        conn.close()
        return df.to_dict(orient="records")
    except Exception as e:
        conn.close()
        return {"error": str(e)}

# ================= JSON CLEAN =================

def extract_json(text: str):
    text = text.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())

    raise ValueError("Invalid JSON from AI")

# ================= GENERATE =================

@app.post("/generate-sql")
async def generate_sql(question: str = Form(...)):

    if not schemas_global:
        return {"error": "No dataset uploaded"}

    schema_text = "\n".join(schemas_global)

    prompt = f"""
You are a senior data engineer.

Database schema:
{schema_text}

User question:
{question}

Return JSON:

{{
  "sql": "",
  "python": "",
  "pyspark": "",
  "explanation": "",
  "warning": "",
  "is_modification": false
}}

RULES:

SQL:
- Proper formatting
- Use correct joins
- No hallucinated columns
- Only use given schema

Return ONLY JSON.
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )

        ai_text = response.choices[0].message.content
        ai_json = extract_json(ai_text)

    except Exception as e:
        return {"error": str(e)}

    sql = ai_json.get("sql", "")
    python_code = ai_json.get("python", "")
    pyspark_code = ai_json.get("pyspark", "")
    explanation = ai_json.get("explanation", "")
    warning = ai_json.get("warning", "")
    is_mod = ai_json.get("is_modification", False)

    result = None

    if sql and not is_mod and sql.lower().startswith("select"):
        result = execute_sql(sql)

    return {
        "sql": sql,
        "python": python_code,
        "pyspark": pyspark_code,
        "explanation": explanation,
        "warning": warning,
        "result": result
    }