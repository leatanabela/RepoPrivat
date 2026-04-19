import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import ollama

from ai.config import settings
from ai.rag_pipeline.rag_chain import ask_question, ask_question_stream
from ai.document_processing.pipeline import process_document, process_all_unprocessed
from ai.ticket_service.classifier import suggest_ticket_metadata
from ai.supabase_client import get_supabase


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warmup: pre-load models into Ollama memory
    try:
        ollama.chat(model=settings.LLM_MODEL, messages=[{"role": "user", "content": "test"}], keep_alive="30m")
        ollama.embed(model=settings.EMBEDDING_MODEL, input="warmup")
        print(f"Models warmed up: {settings.LLM_MODEL}, {settings.EMBEDDING_MODEL}")
    except Exception as e:
        print(f"Warmup failed (Ollama may not be running): {e}")
    yield


app = FastAPI(
    title="AI HelpDesk - AI Service",
    description="RAG pipeline and AI services for the HelpDesk platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Request/Response Models ----

class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None
    user_id: str | None = None
    chat_history: list[dict] | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]
    chunks_used: int


class ProcessDocumentRequest(BaseModel):
    document_id: str
    file_path: str | None = None


class TicketSuggestRequest(BaseModel):
    description: str


# ---- Endpoints ----

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "model": settings.LLM_MODEL, "embedding_model": settings.EMBEDDING_MODEL}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a question and get a RAG-powered answer."""
    try:
        result = await ask_question(
            question=request.question,
            chat_history=request.chat_history,
        )
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Send a question and get a streaming RAG-powered answer via SSE."""

    async def event_stream():
        try:
            async for chunk in ask_question_stream(
                question=request.question,
                chat_history=request.chat_history,
            ):
                data = json.dumps(chunk)
                yield f"data: {data}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.post("/api/documents/process")
async def process_single_document(request: ProcessDocumentRequest):
    """Trigger processing (extraction, chunking, embedding) for a single document."""
    try:
        result = await process_document(
            document_id=request.document_id,
            file_path=request.file_path,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/process-all")
async def process_all_documents():
    """Process all unprocessed documents in the database."""
    try:
        results = await process_all_unprocessed()
        return {
            "processed": len([r for r in results if r.get("status") == "processed"]),
            "errors": len([r for r in results if r.get("status") == "error"]),
            "details": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tickets/suggest")
async def suggest_ticket(request: TicketSuggestRequest):
    """Use AI to suggest department, category, and priority for a ticket."""
    try:
        supabase = get_supabase()

        # Fetch departments and categories
        departments = supabase.table("departments").select("id, name, description").execute()
        categories = (
            supabase.table("ticket_categories")
            .select("id, name, department_id, departments(name)")
            .execute()
        )

        dept_list = departments.data or []
        cat_list = [
            {
                "id": c["id"],
                "name": c["name"],
                "department_name": (c.get("departments") or {}).get("name", ""),
            }
            for c in (categories.data or [])
        ]

        # Run blocking LLM call in thread pool so we don't block event loop
        import asyncio
        result = await asyncio.to_thread(
            suggest_ticket_metadata,
            request.description,
            dept_list,
            cat_list,
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai.main:app", host="0.0.0.0", port=8000, reload=True)
