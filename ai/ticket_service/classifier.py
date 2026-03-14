import json
from ai.chat_service.llm import generate_response

CLASSIFICATION_PROMPT = """Ești un asistent AI care clasifică tichetele de suport pentru o instituție publică din România (primărie).

Analizează descrierea tichetului de mai jos și sugerează:
1. Departamentul cel mai potrivit
2. Categoria cea mai potrivită
3. Nivelul de prioritate (low, medium, high, urgent)

Departamente disponibile:
{departments}

Categorii disponibile:
{categories}

Descrierea tichetului:
{description}

Răspunde DOAR cu un obiect JSON valid în acest format exact, fără alt text:
{{"department": "numele departamentului", "category": "numele categoriei", "priority": "low|medium|high|urgent", "reasoning": "explicație scurtă în română"}}"""


def suggest_ticket_metadata(
    description: str,
    departments: list[dict],
    categories: list[dict],
) -> dict:
    """
    Use llama3:8b to analyze a ticket description and suggest
    the appropriate department, category, and priority.
    """
    dept_list = "\n".join(
        f"- {d['name']}: {d.get('description', '')}" for d in departments
    )
    cat_list = "\n".join(
        f"- {c['name']} (department: {c.get('department_name', 'N/A')})"
        for c in categories
    )

    prompt = CLASSIFICATION_PROMPT.format(
        departments=dept_list,
        categories=cat_list,
        description=description,
    )

    response = generate_response(prompt)

    # Parse JSON from response
    try:
        # Try to extract JSON from the response
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
        result = json.loads(response)
    except json.JSONDecodeError:
        # Fallback if LLM didn't return valid JSON
        result = {
            "department": departments[0]["name"] if departments else None,
            "category": categories[0]["name"] if categories else None,
            "priority": "medium",
            "reasoning": "Nu s-a putut determina automat",
        }

    # Map names back to IDs
    dept_id = None
    for d in departments:
        if d["name"].lower() == result.get("department", "").lower():
            dept_id = d["id"]
            break

    cat_id = None
    for c in categories:
        if c["name"].lower() == result.get("category", "").lower():
            cat_id = c["id"]
            break

    priority = result.get("priority", "medium")
    if priority not in ("low", "medium", "high", "urgent"):
        priority = "medium"

    return {
        "department_id": dept_id,
        "department_name": result.get("department"),
        "category_id": cat_id,
        "category_name": result.get("category"),
        "priority": priority,
        "reasoning": result.get("reasoning", ""),
    }
