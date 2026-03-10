import requests

response = requests.post(
    "http://localhost:11434/api/generate",
    json={"model": "llama3:8b", "prompt": "Salut! Ajută-mă să fac un chatbot"}
)

data = response.json()
print(data["results"][0]["completion"])