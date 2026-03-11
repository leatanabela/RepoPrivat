import json
from ai.chat_service.llm import generate_response

CLASSIFICATION_PROMPT = """You are an AI assistant that classifies support tickets for a public institution.

Given the ticket description below, suggest:
1. The most appropriate department
2. The most appropriate category
3. The priority level (low, medium, high, urgent)

Available departments:
{departments}

Available categories:
{categories}

Ticket description:
{description}

Respond ONLY with a valid JSON object in this exact format, no other text:
{{"department": "department name", "category": "category name", "priority": "low|medium|high|urgent", "reasoning": "brief explanation"}}"""


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
            "reasoning": "Could not determine automatically",
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
