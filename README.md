TEDIHT - The European Digital Innovation Hub in Transilvania

Hackathon - Soluții pentru Digitalizarea Sectorului Public

# AI HelpDesk

Platformă de tip helpdesk cu asistent AI pentru o instituție publică. Utilizatorii (angajații instituțiilor publice, ex: primării, școli, prefecturi) pot pune întrebări unui chatbot care răspunde pe baza documentelor oficiale încărcate în sistem (RAG — Retrieval-Augmented Generation) și pot deschide tichete de suport, atunci când modelul AI nu găsește răspunsul în documente, care vor fi trimise la departamentele responsabile, clasificate automat cu ajutorul AI-ului.

## Funcționalități

- **Chat AI cu documente** — răspunsuri generate local (Ollama) pe baza documentelor instituției, cu afișarea surselor și streaming în timp real (SSE)
- **Tichete de suport** — creare, listare și conversație pe tichete; AI-ul sugerează automat departamentul, categoria și prioritatea pe baza descrierii
- **Gestionare documente (admin)** — încărcare documente, procesare automată (extragere text → împărțire în fragmente → generare embeddings)
- **Titluri automate pentru conversații** — fiecare sesiune de chat primește un titlu scurt generat de AI
- **Panou de administrare** — documente, rapoarte
- **Autentificare și roluri** — prin Supabase Auth, cu profile și departamente

## Arhitectură

```
┌──────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Frontend   │ ───▶ │   Serviciu AI    │ ───▶ │   Ollama    │
│  (Next.js)   │      │ (FastAPI, :8000) │      │  (LLM local)│
└──────┬───────┘      └────────┬─────────┘      └─────────────┘
       │                       │
       └───────┬───────────────┘
               ▼
        ┌─────────────┐
        │  Supabase   │
        │ (Postgres + │
        │  pgvector)  │
        └─────────────┘
```

### Structura proiectului

| Director | Descriere |
|---|---|
| `frontend/` | Aplicația web — Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand |
| `ai/` | Serviciul AI — FastAPI (Python), pipeline RAG, procesare documente, clasificare tichete |
| `backend/` | Serviciu Node.js/TypeScript auxiliar (auth, documente, chat) |
| `database/` | Resurse legate de baza de date |
| `design/` | Mockup-uri HTML pentru interfață (generate cu Stitch) |
| `SQLNou.sql` | Schema bazei de date (roluri, profile, departamente, tichete, documente, chunk-uri, sesiuni de chat) |
| `chatbot_test.py` | Suită de teste pentru acuratețea pipeline-ului RAG |

### Modulele serviciului AI (`ai/`)

- `main.py` — serverul FastAPI cu endpoint-urile principale
- `rag_pipeline/` — retriever (căutare semantică în chunk-uri), lanțul RAG, contextul instituției
- `document_processing/` — extragere text, chunking (300 caractere, suprapunere 75), pipeline de procesare
- `embedding_service/` — generare embeddings cu modelul `bge-m3` (1024 dimensiuni)
- `chat_service/` — apeluri LLM și generarea titlurilor de conversație
- `ticket_service/` — clasificarea tichetelor (departament, categorie, prioritate)

## Tehnologii

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, react-markdown, Supabase JS
- **AI:** Python, FastAPI, Ollama (model LLM `helpdesk-ro`, embeddings `bge-m3`), Pydantic
- **Bază de date:** Supabase (PostgreSQL + pgvector pentru căutare semantică)

## Cerințe preliminare

- Node.js 18+ și npm
- Python 3.11+
- [Ollama](https://ollama.com/) instalat și pornit, cu modelele necesare:
  ```bash
  ollama pull bge-m3
  # + modelul LLM configurat (implicit: helpdesk-ro)
  ```
- Un proiect [Supabase](https://supabase.com/) cu schema din `SQLNou.sql` aplicată

## Configurare

### 1. Variabile de mediu

**`.env` (rădăcina proiectului — folosit de serviciul AI):**
```env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=helpdesk-ro
EMBEDDING_MODEL=bge-m3
CHUNK_SIZE=300
CHUNK_OVERLAP=75
```

**`frontend/.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AI_SERVICE_URL=http://localhost:8000
```

### 2. Baza de date

Rulează scriptul `SQLNou.sql` în SQL Editor-ul din Supabase pentru a crea tabelele (roluri, profile, departamente, tichete, documente, chunk-uri, sesiuni și mesaje de chat).

## Pornirea aplicației

### Serviciul AI (port 8000)

```bash
pip install fastapi uvicorn ollama pydantic-settings supabase
python -m ai.main
# sau: uvicorn ai.main:app --reload --port 8000
```

La pornire, serviciul preîncarcă modelele în memoria Ollama (warmup).

### Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Aplicația va fi disponibilă la [http://localhost:3000](http://localhost:3000).

## Endpoint-uri principale (serviciul AI)

| Metodă | Endpoint | Descriere |
|---|---|---|
| `GET` | `/api/health` | Verificare stare + modelele folosite |
| `POST` | `/api/chat` | Întrebare → răspuns RAG (cu surse) |
| `POST` | `/api/chat/stream` | Răspuns RAG cu streaming (SSE) |
| `POST` | `/api/chat/title` | Generează titlul unei sesiuni de chat |
| `POST` | `/api/documents/process` | Procesează un document (extragere + chunking + embeddings) |
| `POST` | `/api/documents/process-all` | Procesează toate documentele neprocesate |
| `POST` | `/api/tickets/suggest` | Sugerează departament / categorie / prioritate pentru un tichet |

## Testare

Suita de teste pentru acuratețea RAG:

```bash
python chatbot_test.py                  # toate testele
python chatbot_test.py --retrieval-only # doar retrieval
python chatbot_test.py --verbose        # afișează răspunsurile complete
```

Necesită `.env` configurat și Ollama pornit cu modelele descărcate.

## Cum funcționează RAG-ul (pe scurt)

1. **Procesare:** documentele încărcate sunt convertite în text, împărțite în fragmente (chunk-uri) de ~300 de caractere cu suprapunere de 75, iar fiecare fragment primește un embedding (vector de 1024 dimensiuni) salvat în Postgres cu pgvector.
2. **Întrebare:** când utilizatorul întreabă ceva, întrebarea este transformată în embedding și se caută cele mai relevante fragmente (top 6, prag de similaritate 0.35).
3. **Răspuns:** fragmentele găsite sunt trimise ca și context modelului LLM local, care generează răspunsul și citează sursele.
