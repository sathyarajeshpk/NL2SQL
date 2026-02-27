from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import pandas as pd
import io
import os
import sqlite3
import json
import re
import logging
from threading import Lock
from openai import OpenAI

app = FastAPI(title="NL2SQL API", version="1.0.0")
logger = logging.getLogger("nl2sql")
logging.basicConfig(level=logging.INFO)

DB_PATH = "/tmp/data.db"
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".tsv"}
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = (
    OpenAI(api_key=OPENAI_API_KEY, base_url="https://openrouter.ai/api/v1")
    if OPENAI_API_KEY
    else None
)

if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not set. /generate-sql will be unavailable.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

schemas_global: List[str] = []
schema_lock = Lock()


def get_conn():
    return sqlite3.connect(DB_PATH)


def sanitize_table_name(filename: str) -> str:
    base = os.path.splitext(filename)[0].strip().lower()
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", base)
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    return cleaned or "uploaded_table"


@app.get("/")
def root():
    return {"status": "NL2SQL API running"}


@app.get("/health")
def health():
    return {"ok": True, "has_openai_key": bool(OPENAI_API_KEY)}


@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    conn = get_conn()
    new_schemas = []

    try:
        for file in files:
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext not in ALLOWED_EXTENSIONS:
                logger.info("Skipping unsupported file: %s", file.filename)
                continue

            content = await file.read()
            if not content:
                continue

            if file_ext == ".csv":
                df = pd.read_csv(io.BytesIO(content))
            elif file_ext == ".xlsx":
                df = pd.read_excel(io.BytesIO(content))
            else:
                df = pd.read_csv(io.BytesIO(content), sep="\t")

            table_name = sanitize_table_name(file.filename)
            df.to_sql(table_name, conn, index=False, if_exists="replace")
            columns = ", ".join([str(c) for c in df.columns])
            new_schemas.append(f"{table_name}({columns})")

        with schema_lock:
            schemas_global.clear()
            schemas_global.extend(new_schemas)

        return {"message": "Files uploaded", "schemas": schemas_global}
    except Exception as exc:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}") from exc
    finally:
        conn.close()


def execute_sql(sql: str):
    conn = get_conn()
    try:
        df = pd.read_sql_query(sql, conn)
        return df.to_dict(orient="records")
    finally:
        conn.close()


def extract_json(text: str):
    text = text.strip().replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError as exc:
            raise ValueError("Invalid JSON block from AI response") from exc

    raise ValueError("Invalid JSON from AI")


@app.post("/generate-sql")
async def generate_sql(question: str = Form(...)):
    if not OPENAI_API_KEY or client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured")

    with schema_lock:
        available_schemas = list(schemas_global)

    if not available_schemas:
        raise HTTPException(status_code=400, detail="No dataset uploaded")

    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    schema_text = "\n".join(available_schemas)
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
- Use only schema columns and tables.
- SQL must be read-only.
- Return valid JSON only.
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        ai_text = response.choices[0].message.content
        ai_json = extract_json(ai_text)
    except Exception as exc:
        logger.exception("Generation failed")
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}") from exc

    sql = ai_json.get("sql", "")
    result = None

    try:
        if sql and sql.strip().lower().startswith("select") and not ai_json.get("is_modification", False):
            result = execute_sql(sql)
    except Exception as exc:
        result = {"error": str(exc)}

    return {
        "sql": sql,
        "python": ai_json.get("python", ""),
        "pyspark": ai_json.get("pyspark", ""),
        "explanation": ai_json.get("explanation", ""),
        "warning": ai_json.get("warning", ""),
        "result": result,
    }
