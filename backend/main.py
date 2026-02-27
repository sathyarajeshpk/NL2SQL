from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import pandas as pd
import io
import os
from openai import OpenAI
import sqlite3
import json
import re

app = FastAPI()

@app.get("/")
def root():
    return {"status": "NL2SQL API running"}

@app.get("/health")
def health():
    return {"ok": True}

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
def home():
    return {"status": "NL2SQL API running"}

# ================= AI =================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    print("⚠️ WARNING: OPENAI_API_KEY not set")

client = OpenAI(
    api_key=OPENAI_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)

# ================= STORAGE =================
uploaded_tables = {}
schemas_global = []


# ================= UPLOAD =================
@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    global uploaded_tables, schemas_global

    uploaded_tables = {}
    schemas_global = []

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

        uploaded_tables[table_name] = df

        columns = ", ".join(df.columns)
        schemas_global.append(f"{table_name}({columns})")

    return {
        "message": "Files uploaded",
        "schemas": schemas_global
    }


# ================= SQL EXECUTION =================
def execute_sql(sql: str):

    conn = sqlite3.connect(":memory:")

    for name, df in uploaded_tables.items():
        df.to_sql(name, conn, index=False, if_exists="replace")

    try:
        result_df = pd.read_sql_query(sql, conn)
        return result_df.to_dict(orient="records")
    except Exception as e:
        return {"error": str(e)}


# ================= CLEAN JSON =================
def extract_json(text: str):
    """
    Extract JSON safely from AI response
    """
    text = text.strip()

    # remove markdown
    text = text.replace("```json", "").replace("```", "").strip()

    # try direct
    try:
        return json.loads(text)
    except:
        pass

    # try regex extraction
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())

    raise ValueError("Invalid JSON from AI")


# ================= GENERATE =================
@app.post("/generate-sql")
async def generate_sql(question: str = Form(...)):

    if not uploaded_tables:
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
- Proper formatting with line breaks
- No unnecessary aliases
- Clean readable joins

Python:
- Use pandas
- Table names = dataframe variables

PySpark:
- Use spark dataframe names same as tables

Modification:
If INSERT/UPDATE/DELETE:
- still generate
- set is_modification=true
- include warning

Return ONLY JSON.
"""

    try:

        response = client.chat.completions.create(
            model="openrouter/auto",
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

    