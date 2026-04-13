"""
AI HelpDesk - RAG Accuracy Test Suite
Tests retrieval quality, answer accuracy, and edge cases.

Usage:
    python chatbot_test.py                    # Run all tests
    python chatbot_test.py --retrieval-only   # Test retrieval only
    python chatbot_test.py --verbose          # Show full answers

Requires: .env with SUPABASE_URL and SUPABASE_SERVICE_KEY
Requires: Ollama running with llama3:8b and bge-m3 models
"""

import sys
import time
import json
import argparse
from dataclasses import dataclass, field

# Add project root to path
sys.path.insert(0, ".")

from ai.config import settings
from ai.embedding_service.embeddings import generate_embedding
from ai.rag_pipeline.retriever import retrieve_relevant_chunks
from ai.chat_service.llm import _sync_generate
from ai.rag_pipeline.rag_chain import _build_prompt, SYSTEM_PROMPT


# ============================================================
# Test Data
# ============================================================

@dataclass
class TestCase:
    """A single test case for evaluating the RAG pipeline."""
    question: str
    expected_keywords: list[str]           # Keywords that SHOULD appear in the answer
    negative_keywords: list[str] = field(default_factory=list)  # Keywords that should NOT appear
    min_chunks: int = 1                     # Minimum retrieved chunks expected
    language: str = "ro"                    # Expected response language


# Define test cases - these should be customized based on your actual documents
# After running once, update these with real questions from your documents
TEST_CASES = [
    # =============================================
    # CAT 1: Statutul personalului (8 teste)
    # =============================================
    TestCase(question="Care este durata normala a timpului de munca pentru personalul penitenciar?", expected_keywords=["8 ore", "40"], min_chunks=1),
    TestCase(question="Ce drepturi are politistul de penitenciare?", expected_keywords=["drept", "poliţist"], min_chunks=1),
    TestCase(question="Care sunt sanctiunile disciplinare prevazute in statut?", expected_keywords=["sancțiuni", "disciplinar"], min_chunks=1),
    TestCase(question="Cum se face promovarea in grad profesional?", expected_keywords=["promovare", "grad"], min_chunks=1),
    TestCase(question="Ce conditii trebuie indeplinite pentru a deveni politist de penitenciare?", expected_keywords=["condiți", "penitenciar"], min_chunks=1),
    TestCase(question="Cum se calculeaza salariul politistului de penitenciare?", expected_keywords=["salar", "drept"], min_chunks=1),
    TestCase(question="Care sunt motivele de suspendare din functie?", expected_keywords=["suspend", "funcți"], min_chunks=1),
    TestCase(question="Ce se intampla la incetarea raportului de serviciu?", expected_keywords=["încetare", "raport"], min_chunks=1),

    # =============================================
    # CAT 2: OUG 57 Codul Administrativ (8 teste)
    # =============================================
    TestCase(question="Care sunt atributiile consiliului judetean?", expected_keywords=["consiliu", "județean"], min_chunks=1),
    TestCase(question="Cum se organizeaza sedintele consiliului local?", expected_keywords=["ședinț", "consiliu"], min_chunks=1),
    TestCase(question="Ce conditii trebuie indeplinite pentru functia publica?", expected_keywords=["funcți", "condiți"], min_chunks=1),
    TestCase(question="Care este procesul de achizitii publice?", expected_keywords=["achiziți"], min_chunks=1),
    TestCase(question="Care sunt principiile administratiei publice?", expected_keywords=["principi", "administrați"], min_chunks=1),
    TestCase(question="Cum se numeste si se elibereaza din functie primarul?", expected_keywords=["primar"], min_chunks=1),
    TestCase(question="Ce sunt actele administrative si cum se emit?", expected_keywords=["act", "administrativ"], min_chunks=1),
    TestCase(question="Care sunt drepturile si obligatiile functionarilor publici?", expected_keywords=["drept", "funcționar"], min_chunks=1),

    # =============================================
    # CAT 3: Regulament organizare (6 teste)
    # =============================================
    TestCase(question="Care este structura organizatorica a institutiei?", expected_keywords=["organizare", "structur"], min_chunks=1),
    TestCase(question="Cine sunt membrii conducerii si ce atributii au?", expected_keywords=["conducere", "atribuți"], min_chunks=1),
    TestCase(question="Ce departamente exista in cadrul institutiei?", expected_keywords=["departament", "direcți"], min_chunks=1),
    TestCase(question="Care sunt atributiile directiei economice?", expected_keywords=["economic", "atribuți"], min_chunks=1),
    TestCase(question="Cum se realizeaza achizitiile publice in institutie?", expected_keywords=["achiziți", "public"], min_chunks=1),
    TestCase(question="Ce responsabilitati are directia juridica?", expected_keywords=["juridic", "atribuți"], min_chunks=1),

    # =============================================
    # CAT 4: Lege executare pedepse (8 teste)
    # =============================================
    TestCase(question="Care sunt drepturile detinutilor?", expected_keywords=["deținut", "drept"], min_chunks=1),
    TestCase(question="Cum se desfasoara vizitele in penitenciar?", expected_keywords=["vizit"], min_chunks=1),
    TestCase(question="Ce reguli exista pentru regimul de executare a pedepselor?", expected_keywords=["regim", "executare"], min_chunks=1),
    TestCase(question="Cum se asigura asistenta medicala in penitenciar?", expected_keywords=["medical", "asistent"], min_chunks=1),
    TestCase(question="Ce activitati educative sunt disponibile pentru detinuti?", expected_keywords=["educa", "activit"], min_chunks=1),
    TestCase(question="Cum se face transferul detinutilor intre penitenciare?", expected_keywords=["transfer", "penitenciar"], min_chunks=1),
    TestCase(question="Care sunt regulile privind corespondenta detinutilor?", expected_keywords=["coresponden", "deținut"], min_chunks=1),
    TestCase(question="Ce drepturi au detinutii la hrana si cazare?", expected_keywords=["hran", "cazare"], min_chunks=1),

    # =============================================
    # CAT 5: Regulament intern (6 teste)
    # =============================================
    TestCase(question="Ce obligatii are angajatul conform regulamentului intern?", expected_keywords=["obligați", "angajat"], min_chunks=1),
    TestCase(question="Care este programul de lucru conform regulamentului?", expected_keywords=["program", "lucru"], min_chunks=1),
    TestCase(question="Ce sanctiuni se aplica pentru abateri disciplinare?", expected_keywords=["sancțiuni", "disciplinar"], min_chunks=1),
    TestCase(question="Cum se acorda concediul de odihna?", expected_keywords=["concediu", "odihn"], min_chunks=1),
    TestCase(question="Ce drepturi salariale are personalul?", expected_keywords=["salar", "drept"], min_chunks=1),
    TestCase(question="Care sunt regulile de protectie a muncii?", expected_keywords=["protecți", "munc"], min_chunks=1),

    # =============================================
    # CAT 6: Regulament urbanism (5 teste)
    # =============================================
    TestCase(question="Care sunt regulile de urbanism pentru constructii noi?", expected_keywords=["urbanism", "construcți"], min_chunks=1),
    TestCase(question="Ce autorizatii sunt necesare pentru construirea unei cladiri?", expected_keywords=["autorizați", "construi"], min_chunks=1),
    TestCase(question="Care sunt retragerile minime fata de limitele de proprietate?", expected_keywords=["retragere", "limit"], min_chunks=1),
    TestCase(question="Ce reguli exista pentru parcaje si spatii verzi?", expected_keywords=["parcaj", "spați"], min_chunks=1),
    TestCase(question="Care este inaltimea maxima admisa pentru constructii?", expected_keywords=["înălțime", "maxim"], min_chunks=1),

    # =============================================
    # CAT 7: Cod etic si integritate (5 teste)
    # =============================================
    TestCase(question="Care sunt principiile codului de etica si integritate?", expected_keywords=["etic", "integritate"], min_chunks=1),
    TestCase(question="Ce interdictii exista privind conflictul de interese?", expected_keywords=["conflict", "interes"], min_chunks=1),
    TestCase(question="Cum se face declararea averilor conform codului etic?", expected_keywords=["declarați", "avere"], min_chunks=1),
    TestCase(question="Care sunt normele de conduita etica aplicabile functionarilor publici?", expected_keywords=["conduit", "etic"], min_chunks=1),
    TestCase(question="Cum se semnaleaza actele de coruptie?", expected_keywords=["corupți", "semnal"], min_chunks=1),

    # =============================================
    # CAT 8: Strategia Penitenciar (5 teste)
    # =============================================
    TestCase(question="Care sunt obiectivele strategiei de dezvoltare a sistemului penitenciar?", expected_keywords=["obiectiv", "penitenciar"], min_chunks=1),
    TestCase(question="Ce masuri de reintegrare sociala sunt prevazute pentru detinuti?", expected_keywords=["reintegr", "social"], min_chunks=1),
    TestCase(question="Cum se planifica modernizarea penitenciarelor?", expected_keywords=["moderniz", "penitenciar"], min_chunks=1),
    TestCase(question="Care sunt resursele umane necesare in sistemul penitenciar?", expected_keywords=["resurs", "personal"], min_chunks=1),
    TestCase(question="Ce investitii sunt planificate in infrastructura penitenciara?", expected_keywords=["investiți", "penitenciar"], min_chunks=1),

    # =============================================
    # CAT 9: Strategia Anticoruptie (5 teste)
    # =============================================
    TestCase(question="Care sunt obiectivele strategiei nationale anticoruptie?", expected_keywords=["anticorupți", "obiectiv"], min_chunks=1),
    TestCase(question="Ce masuri de prevenire a coruptiei sunt prevazute?", expected_keywords=["prevenire", "corupți"], min_chunks=1),
    TestCase(question="Cum se asigura transparenta in achizitiile publice?", expected_keywords=["transparen", "achiziți"], min_chunks=1),
    TestCase(question="Ce institutii sunt responsabile de implementarea strategiei anticoruptie?", expected_keywords=["instituți", "implementare"], min_chunks=1),
    TestCase(question="Care sunt indicatorii de monitorizare ai strategiei anticoruptie?", expected_keywords=["indicator", "monitorizare"], min_chunks=1),

    # =============================================
    # CAT 10: Lege invatamant + statut elevi (7 teste)
    # =============================================
    TestCase(question="Care sunt drepturile elevilor conform legislatiei?", expected_keywords=["drept", "elev"], min_chunks=1),
    TestCase(question="Cum se organizeaza invatamantul preuniversitar?", expected_keywords=["învățământ", "preuniversitar"], min_chunks=1),
    TestCase(question="Ce sanctiuni se aplica elevilor care incalca regulamentul?", expected_keywords=["sancțiuni", "elev"], min_chunks=1),
    TestCase(question="Cum se desfasoara evaluarea nationala?", expected_keywords=["evaluare", "național"], min_chunks=1),
    TestCase(question="Care sunt obligatiile parintilor conform legii invatamantului?", expected_keywords=["obligați", "părinte"], min_chunks=1),
    TestCase(question="Cum se organizeaza examenul de bacalaureat?", expected_keywords=["bacalaureat", "examen"], min_chunks=1),
    TestCase(question="Ce tipuri de invatamant exista in sistemul romanesc?", expected_keywords=["învățământ", "tip"], min_chunks=1),

    # =============================================
    # CAT 11: Cross-document (6 teste)
    # =============================================
    TestCase(question="Ce se intampla daca un functionar public comite o abatere disciplinara?", expected_keywords=["abatere", "disciplinar"], min_chunks=1),
    TestCase(question="Cum functioneaza sistemul de achizitii publice si ce legi il reglementeaza?", expected_keywords=["achiziți", "public"], min_chunks=1),
    TestCase(question="Care sunt conditiile de detentie si drepturile persoanelor private de libertate?", expected_keywords=["deținut", "drept"], min_chunks=1),
    TestCase(question="Cum se rezolva un conflict de interese in administratia publica?", expected_keywords=["conflict", "interes"], min_chunks=1),
    TestCase(question="Ce reglementari exista privind protectia datelor personale ale angajatilor?", expected_keywords=["date", "personal"], min_chunks=1),
    TestCase(question="Cum se asigura egalitatea de sanse in institutiile publice?", expected_keywords=["egalitate", "șanse"], min_chunks=1),

    # =============================================
    # CAT 12: Cross-doc AMBIGUITY - termeni comuni in mai multe documente (25 teste)
    # Aceste intrebari sunt intentionat ambigue - termenul apare in 2+ documente
    # =============================================
    # "sanctiuni" apare in: regulament intern, statut personal, OUG 57, lege executare, statut elevi
    TestCase(question="Ce sanctiuni exista conform legii?", expected_keywords=["sancțiuni"], min_chunks=1),
    TestCase(question="Cum se aplica sanctiunile disciplinare?", expected_keywords=["disciplinar"], min_chunks=1),
    TestCase(question="Cine decide aplicarea sanctiunilor?", expected_keywords=["sancțiuni", "comisi"], min_chunks=1),

    # "drepturi" apare in: statut personal, lege executare, regulament intern, statut elevi, OUG 57
    TestCase(question="Ce drepturi am ca angajat?", expected_keywords=["drept"], min_chunks=1),
    TestCase(question="Care sunt drepturile mele conform legii?", expected_keywords=["drept"], min_chunks=1),
    TestCase(question="Ce drepturi salariale sunt prevazute in legislatie?", expected_keywords=["salar", "drept"], min_chunks=1),

    # "obligatii" apare in: regulament intern, cod etic, OUG 57, statut personal
    TestCase(question="Ce obligatii am la locul de munca?", expected_keywords=["obligați", "munc"], min_chunks=1),
    TestCase(question="Care sunt obligatiile legale ale personalului?", expected_keywords=["obligați", "personal"], min_chunks=1),

    # "concediu" apare in: regulament intern, statut personal, OUG 57
    TestCase(question="Cate zile de concediu am dreptul?", expected_keywords=["concediu", "zile"], min_chunks=1),
    TestCase(question="Cum se aproba concediul de odihna?", expected_keywords=["concediu"], min_chunks=1),
    TestCase(question="Ce tipuri de concediu exista?", expected_keywords=["concediu"], min_chunks=1),

    # "transfer" apare in: lege executare, statut personal, regulament organizare
    TestCase(question="Cum se face transferul de personal?", expected_keywords=["transfer"], min_chunks=1),
    TestCase(question="Ce conditii sunt necesare pentru transfer?", expected_keywords=["transfer", "condiți"], min_chunks=1),

    # "evaluare" apare in: OUG 57, lege invatamant, evaluare nationala, statut personal
    TestCase(question="Cum se face evaluarea performantelor profesionale?", expected_keywords=["evaluare", "performanț"], min_chunks=1),
    TestCase(question="Cine evalueaza personalul si dupa ce criterii?", expected_keywords=["evaluare", "criteri"], min_chunks=1),
    TestCase(question="Care este procedura de evaluare anuala?", expected_keywords=["evaluare", "anual"], min_chunks=1),

    # "coruptie" apare in: cod etic, strategia anticoruptie, OUG 57
    TestCase(question="Ce masuri anticoruptie trebuie respectate?", expected_keywords=["anticorupți", "masuri"], min_chunks=1),
    TestCase(question="Cum se previne coruptia in institutiile publice?", expected_keywords=["corupți", "preven"], min_chunks=1),

    # "organizare" apare in: regulament organizare, lege invatamant, regulament intern
    TestCase(question="Cum este organizata institutia?", expected_keywords=["organizat", "instituți"], min_chunks=1),
    TestCase(question="Care este regulamentul de organizare si functionare?", expected_keywords=["regulament", "organizare"], min_chunks=1),

    # "autorizatie/certificat" apare in: regulament urbanism, regulament organizare
    TestCase(question="Ce acte si certificate emite institutia?", expected_keywords=["certificat"], min_chunks=1),

    # "strategie/plan" apare in: strategia penitenciar, strategia anticoruptie
    TestCase(question="Ce strategii nationale sunt in vigoare?", expected_keywords=["strategi", "național"], min_chunks=1),
    TestCase(question="Care sunt planurile de dezvoltare ale institutiei?", expected_keywords=["dezvoltare", "plan"], min_chunks=1),

    # "detasare/mutare" apare in: statut personal, OUG 57, regulament intern
    TestCase(question="Cum se face detasarea unui angajat?", expected_keywords=["detașare", "angajat"], min_chunks=1),
    TestCase(question="Ce drepturi are angajatul in caz de mutare?", expected_keywords=["mutare", "drept"], min_chunks=1),

    # =============================================
    # CAT 13: Intrebari VAGI / ambigue (15 teste)
    # Intrebari scurte, neclare, care testeaza robustetea
    # =============================================
    TestCase(question="Ce zice legea?", expected_keywords=["lege"], min_chunks=1),
    TestCase(question="Care sunt regulile?", expected_keywords=["regul"], min_chunks=1),
    TestCase(question="Ce trebuie sa fac?", expected_keywords=["trebuie"], min_chunks=1),
    TestCase(question="Am dreptul la concediu?", expected_keywords=["concediu", "drept"], min_chunks=1),
    TestCase(question="Pot fi dat afara?", expected_keywords=["încetare", "raport"], min_chunks=1),
    TestCase(question="Cat castig?", expected_keywords=["salar"], min_chunks=1),
    TestCase(question="Cine este directorul si ce atributii are?", expected_keywords=["director", "atribuți"], min_chunks=1),
    TestCase(question="Ce fac daca am o problema?", expected_keywords=["problem", "solicit"], min_chunks=1),
    TestCase(question="Unde depun o plangere?", expected_keywords=["plângere", "depune"], min_chunks=1),
    TestCase(question="Ce documente trebuie sa completez?", expected_keywords=["document", "complet"], min_chunks=1),
    TestCase(question="Pot sa fiu transferat?", expected_keywords=["transfer"], min_chunks=1),
    TestCase(question="Exista vreun cod etic?", expected_keywords=["cod", "etic"], min_chunks=1),
    TestCase(question="Ce se intampla daca gresesc?", expected_keywords=["abatere", "sancțiuni"], min_chunks=1),
    TestCase(question="Cum ma pot promova?", expected_keywords=["promovare", "grad"], min_chunks=1),
    TestCase(question="Ce beneficii am?", expected_keywords=["drept", "benefici"], min_chunks=1),

    # =============================================
    # CAT 14: Intrebari in ENGLEZA (8 teste)
    # =============================================
    TestCase(question="What are the employee rights?", expected_keywords=["drept", "right"], min_chunks=1, language="en"),
    TestCase(question="How does the disciplinary process work?", expected_keywords=["disciplin"], min_chunks=1, language="en"),
    TestCase(question="What is the organizational structure?", expected_keywords=["organiz", "structur"], min_chunks=1, language="en"),
    TestCase(question="How are public acquisitions regulated?", expected_keywords=["achiziți", "acquis"], min_chunks=1, language="en"),
    TestCase(question="What are the rules for detention?", expected_keywords=["detenți", "detent"], min_chunks=1, language="en"),
    TestCase(question="How is the education system organized?", expected_keywords=["educați", "învățământ"], min_chunks=1, language="en"),
    TestCase(question="What anti-corruption measures exist?", expected_keywords=["corupți", "anticorup"], min_chunks=1, language="en"),
    TestCase(question="What are the urban planning regulations?", expected_keywords=["urban", "regulament"], min_chunks=1, language="en"),

    # =============================================
    # CAT 15: Intrebari cu DIACRITICE vs fara (6 teste)
    # =============================================
    TestCase(question="Care sunt sancțiunile disciplinare?", expected_keywords=["sancțiuni", "disciplinar"], min_chunks=1),
    TestCase(question="Care sunt sanctiunile disciplinare?", expected_keywords=["sancțiuni", "disciplinar"], min_chunks=1),
    TestCase(question="Cum se face evaluarea funcționarilor?", expected_keywords=["evaluare", "funcționar"], min_chunks=1),
    TestCase(question="Cum se face evaluarea functionarilor?", expected_keywords=["evaluare", "funcționar"], min_chunks=1),
    TestCase(question="Ce drepturi au deținuții?", expected_keywords=["drept", "deținut"], min_chunks=1),
    TestCase(question="Ce drepturi au detinutii?", expected_keywords=["drept", "deținut"], min_chunks=1),

    # =============================================
    # CAT 16: Edge cases - irelevante (6 teste)
    # =============================================
    TestCase(question="Care este rata inflatiei din Romania in 2025?", expected_keywords=["nu am găsit", "informații", "disponibil"], min_chunks=0),
    TestCase(question="Cum se instaleaza Python pe Windows?", expected_keywords=["nu am găsit", "informații", "disponibil"], min_chunks=0),
    TestCase(question="Ce reteta de prajitura recomandati?", expected_keywords=["nu am găsit", "informații", "disponibil"], min_chunks=0),
    TestCase(question="Cine a castigat Champions League in 2024?", expected_keywords=["nu am găsit", "informații", "disponibil"], min_chunks=0),
    TestCase(question="Care este capitala Australiei?", expected_keywords=["nu am găsit", "informații", "disponibil"], min_chunks=0),
    TestCase(question="Cum se face o rezervare la hotel?", expected_keywords=["nu am găsit", "informații", "disponibil"], min_chunks=0),
]

# Category mapping for statistics
CATEGORIES = {
    "Statutul personalului": (0, 8),
    "OUG 57 Cod Administrativ": (8, 16),
    "Regulament organizare": (16, 22),
    "Lege executare pedepse": (22, 30),
    "Regulament intern": (30, 36),
    "Regulament urbanism": (36, 41),
    "Cod etic si integritate": (41, 46),
    "Strategia Penitenciar": (46, 51),
    "Strategia Anticoruptie": (51, 56),
    "Lege invatamant + elevi": (56, 63),
    "Cross-document": (63, 69),
    "Ambiguity (multi-doc)": (69, 94),
    "Intrebari vagi": (94, 109),
    "Engleza": (109, 117),
    "Diacritice vs fara": (117, 123),
    "Edge cases (irelevante)": (123, 129),
}


# ============================================================
# Test Runner
# ============================================================

@dataclass
class TestResult:
    question: str
    passed: bool
    retrieval_count: int
    retrieval_time_ms: float
    answer_time_ms: float = 0.0
    similarity_scores: list[float] = field(default_factory=list)
    keyword_hits: list[str] = field(default_factory=list)
    keyword_misses: list[str] = field(default_factory=list)
    negative_hits: list[str] = field(default_factory=list)
    answer_preview: str = ""
    error: str = ""


def test_retrieval(test_case: TestCase, verbose: bool = False) -> TestResult:
    """Test document retrieval for a given question."""
    start = time.time()
    try:
        chunks = retrieve_relevant_chunks(
            query=test_case.question,
            top_k=settings.RETRIEVAL_TOP_K,
            threshold=settings.RETRIEVAL_THRESHOLD,
        )
    except Exception as e:
        return TestResult(
            question=test_case.question,
            passed=False,
            retrieval_count=0,
            retrieval_time_ms=0,
            error=str(e),
        )
    retrieval_ms = (time.time() - start) * 1000

    similarities = [c["similarity"] for c in chunks]
    passed = len(chunks) >= test_case.min_chunks

    if verbose and chunks:
        print(f"    Top chunks:")
        for i, c in enumerate(chunks[:3]):
            print(f"      [{i+1}] sim={c['similarity']:.3f} | {c['document_title']} | {c['content'][:80]}...")

    return TestResult(
        question=test_case.question,
        passed=passed,
        retrieval_count=len(chunks),
        retrieval_time_ms=retrieval_ms,
        similarity_scores=similarities,
    )


def test_full_pipeline(test_case: TestCase, verbose: bool = False) -> TestResult:
    """Test full RAG pipeline: retrieval + answer generation."""
    # Step 1: Retrieval
    start_ret = time.time()
    try:
        chunks = retrieve_relevant_chunks(
            query=test_case.question,
            top_k=settings.RETRIEVAL_TOP_K,
            threshold=settings.RETRIEVAL_THRESHOLD,
        )
    except Exception as e:
        return TestResult(
            question=test_case.question,
            passed=False,
            retrieval_count=0,
            retrieval_time_ms=0,
            error=f"Retrieval error: {e}",
        )
    retrieval_ms = (time.time() - start_ret) * 1000

    similarities = [c["similarity"] for c in chunks]

    # Step 2: Generate answer
    start_gen = time.time()
    try:
        prompt = _build_prompt(test_case.question, chunks)
        answer = _sync_generate(prompt, system_prompt=SYSTEM_PROMPT)
    except Exception as e:
        return TestResult(
            question=test_case.question,
            passed=False,
            retrieval_count=len(chunks),
            retrieval_time_ms=retrieval_ms,
            error=f"Generation error: {e}",
        )
    answer_ms = (time.time() - start_gen) * 1000

    # Step 3: Evaluate answer
    answer_lower = answer.lower()

    keyword_hits = [kw for kw in test_case.expected_keywords if kw.lower() in answer_lower]
    keyword_misses = [kw for kw in test_case.expected_keywords if kw.lower() not in answer_lower]
    negative_hits = [kw for kw in test_case.negative_keywords if kw.lower() in answer_lower]

    # Pass criteria:
    # 1. At least 50% of expected keywords found
    # 2. No negative keywords found
    # 3. Minimum chunks retrieved (except for edge cases)
    keyword_ratio = len(keyword_hits) / max(len(test_case.expected_keywords), 1)
    passed = (
        keyword_ratio >= 0.5
        and len(negative_hits) == 0
        and len(chunks) >= test_case.min_chunks
    )

    if verbose:
        print(f"    Answer ({len(answer)} chars, {answer_ms:.0f}ms):")
        preview = answer[:300].replace("\n", " ")
        print(f"      {preview}...")
        if chunks:
            print(f"    Top chunks:")
            for i, c in enumerate(chunks[:3]):
                print(f"      [{i+1}] sim={c['similarity']:.3f} | {c['document_title']}")

    return TestResult(
        question=test_case.question,
        passed=passed,
        retrieval_count=len(chunks),
        retrieval_time_ms=retrieval_ms,
        answer_time_ms=answer_ms,
        similarity_scores=similarities,
        keyword_hits=keyword_hits,
        keyword_misses=keyword_misses,
        negative_hits=negative_hits,
        answer_preview=answer[:200],
    )


def print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def print_result(i: int, result: TestResult):
    status = "PASS" if result.passed else "FAIL"
    icon = "+" if result.passed else "-"
    print(f"  [{icon}] {status} | Q: {result.question}")
    if result.error:
        print(f"       Error: {result.error}")
    else:
        print(f"       Chunks: {result.retrieval_count} | Retrieval: {result.retrieval_time_ms:.0f}ms", end="")
        if result.answer_time_ms > 0:
            print(f" | Answer: {result.answer_time_ms:.0f}ms", end="")
        if result.similarity_scores:
            avg_sim = sum(result.similarity_scores) / len(result.similarity_scores)
            print(f" | Avg sim: {avg_sim:.3f}", end="")
        print()
        if result.keyword_hits:
            print(f"       Keywords found: {', '.join(result.keyword_hits)}")
        if result.keyword_misses:
            print(f"       Keywords MISSING: {', '.join(result.keyword_misses)}")
        if result.negative_hits:
            print(f"       Negative keywords FOUND: {', '.join(result.negative_hits)}")


def run_tests(retrieval_only: bool = False, verbose: bool = False):
    """Run all tests and print a summary."""
    mode = "Retrieval Only" if retrieval_only else "Full Pipeline (Retrieval + Generation)"
    print_header(f"AI HelpDesk - RAG Accuracy Tests ({mode})")

    print(f"  Config:")
    print(f"    LLM Model:       {settings.LLM_MODEL}")
    print(f"    Embedding Model: {settings.EMBEDDING_MODEL}")
    print(f"    Chunk Size:      {settings.CHUNK_SIZE}")
    print(f"    Chunk Overlap:   {settings.CHUNK_OVERLAP}")
    print(f"    Top K:           {settings.RETRIEVAL_TOP_K}")
    print(f"    Threshold:       {settings.RETRIEVAL_THRESHOLD}")
    print(f"    Test Cases:      {len(TEST_CASES)}")
    print()

    results: list[TestResult] = []
    total_start = time.time()

    for i, test_case in enumerate(TEST_CASES, 1):
        print(f"  [{i}/{len(TEST_CASES)}] Testing: {test_case.question}")
        if retrieval_only:
            result = test_retrieval(test_case, verbose=verbose)
        else:
            result = test_full_pipeline(test_case, verbose=verbose)
        results.append(result)
        print_result(i, result)
        print()

    total_time = time.time() - total_start

    # Summary
    print_header("Summary")
    passed = sum(1 for r in results if r.passed)
    failed = len(results) - passed
    accuracy = (passed / len(results)) * 100 if results else 0

    print(f"  Total:     {len(results)} tests")
    print(f"  Passed:    {passed}")
    print(f"  Failed:    {failed}")
    print(f"  Accuracy:  {accuracy:.1f}%")
    print(f"  Total Time: {total_time:.1f}s")

    if results:
        avg_retrieval = sum(r.retrieval_time_ms for r in results) / len(results)
        print(f"  Avg Retrieval: {avg_retrieval:.0f}ms")

        if not retrieval_only:
            gen_results = [r for r in results if r.answer_time_ms > 0]
            if gen_results:
                avg_answer = sum(r.answer_time_ms for r in gen_results) / len(gen_results)
                print(f"  Avg Generation: {avg_answer:.0f}ms")

        all_sims = [s for r in results for s in r.similarity_scores]
        if all_sims:
            print(f"  Avg Similarity: {sum(all_sims)/len(all_sims):.3f}")
            print(f"  Min Similarity: {min(all_sims):.3f}")
            print(f"  Max Similarity: {max(all_sims):.3f}")

    # Category breakdown
    if hasattr(sys.modules[__name__], 'CATEGORIES'):
        from chatbot_test import CATEGORIES
        print_header("Statistics by Category")
        print(f"  {'Category':<30} {'Pass':>5} {'Fail':>5} {'Acc':>6} {'Avg Sim':>8} {'Avg ms':>7}")
        print(f"  {'-'*30} {'-'*5} {'-'*5} {'-'*6} {'-'*8} {'-'*7}")
        for cat_name, (start, end) in CATEGORIES.items():
            cat_results = results[start:end]
            cat_passed = sum(1 for r in cat_results if r.passed)
            cat_failed = len(cat_results) - cat_passed
            cat_acc = (cat_passed / len(cat_results)) * 100 if cat_results else 0
            cat_sims = [s for r in cat_results for s in r.similarity_scores]
            cat_avg_sim = sum(cat_sims) / len(cat_sims) if cat_sims else 0
            cat_avg_ms = sum(r.retrieval_time_ms for r in cat_results) / len(cat_results) if cat_results else 0
            status = "PASS" if cat_failed == 0 else "FAIL"
            print(f"  {cat_name:<30} {cat_passed:>5} {cat_failed:>5} {cat_acc:>5.1f}% {cat_avg_sim:>8.3f} {cat_avg_ms:>6.0f}ms")

    print()

    # Return exit code
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI HelpDesk RAG Accuracy Tests")
    parser.add_argument("--retrieval-only", action="store_true", help="Only test retrieval, skip LLM generation")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show full answers and chunk details")
    args = parser.parse_args()

    exit_code = run_tests(retrieval_only=args.retrieval_only, verbose=args.verbose)
    sys.exit(exit_code)
