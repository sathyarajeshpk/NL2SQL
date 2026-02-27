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

# ================= ROOT =================

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

# ================= AI =================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
print("⚠️ WARNING: OPENAI_API_KEY not set")

client = OpenAI(
api_key=OPENAI_API_KEY,
base_url="https://openrouter.ai/api/v1"
)

# ================= STORAGE =================

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ================= LOAD TABLES =================

def load_tables():
tables = {}
schemas = []

```
for file in os.listdir(UPLOAD_DIR):  
    path = os.path.join(UPLOAD_DIR, file)  

    try:  
        if file.endswith(".csv"):  
            df = pd.read_csv(path)  
        elif file.endswith(".xlsx"):  
            df = pd.read_excel(path)  
        elif file.endswith(".tsv"):  
            df = pd.read_csv(path, sep="\t")  
        else:  
            continue  

        name = file.split(".")[0]  
        tables[name] = df  
        schemas.append(f"{name}({', '.join(df.columns)})")  

    except Exception as e:  
        print("Error loading file:", file, e)  

return tables, schemas  
```

# ================= UPLOAD =================

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):

```
for file in files:  
    content = await file.read()  
    path = os.path.join(UPLOAD_DIR, file.filename)  

    with open(path, "wb") as f:  
        f.write(content)  

tables, schemas = load_tables()  

return {  
    "message": "Files uploaded",  
    "schemas": schemas  
}  
```

# ================= SQL EXECUTION =================

def execute_sql(sql: str):

```
tables, _ = load_tables()  

conn = sqlite3.connect(":memory:")  

for name, df in tables.items():  
    df.to_sql(name, conn, index=False, if_exists="replace")  

try:  
    result_df = pd.read_sql_query(sql, conn)  
    return result_df.to_dict(orient="records")  
except Exception as e:  
    return {"error": str(e)}  
```

# ================= CLEAN JSON =================

def extract_json(text: str):
text = text.strip()
text = text.replace("`json", "").replace("`", "").strip()

```
try:  
    return json.loads(text)  
except:  
    pass  

match = re.search(r"\{.*\}", text, re.DOTALL)  
if match:  
    return json.loads(match.group())  

raise ValueError("Invalid JSON from AI")  
```

# ================= GENERATE =================

@app.post("/generate-sql")
async def generate_sql(question: str = Form(...)):

```
tables, schemas = load_tables()  

if not tables:  
    return {"error": "No dataset uploaded"}  

schema_text = "\n".join(schemas)  

prompt = f"""  
```

You are a senior data engineer and SQL expert.

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

* Proper formatting with line breaks
* Prefer meaningful joins between tables
* Do not invent columns
* Must work in SQLite

Return ONLY JSON.
"""

```
try:  

    response = client.chat.completions.create(  
        model="anthropic/claude-3.5-sonnet",  
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
```
