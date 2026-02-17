"""Debug script for Scholar clarify endpoint."""
from dashboard.scholar import generate_ai_answer, MAX_CONTEXT_CHARS
from rag_notes import search_rag_docs
from pathlib import Path

user_message = 'What is learning?'
scholar_question = 'Test Q'
history = [{'role': 'user', 'content': 'What is learning?'}]

# Build context
repo_root = Path('.').parent.resolve()
context_parts = []
context_parts.append(f'Primary Scholar Question being discussed: {scholar_question}')

# Search RAG
try:
    rag_results = search_rag_docs(user_message, limit=3, corpus='repo')
    print('RAG results count:', len(rag_results) if rag_results else 0)
except Exception as e:
    print('RAG error:', e)

# Build full prompt  
full_prompt = user_message
if history:
    # This is the bug - slicing history[:-1] when history has only 1 element returns EMPTY LIST!
    history_limited = history[-11:-1] if len(history) > 10 else history[:-1]
    print('history:', history)
    print('history_limited (should not be empty):', history_limited)
    
    history_text = "\\n".join([f"{m['role'].upper()}: {m['content'][:500]}" for m in history_limited])
    print('history_text:', repr(history_text))
    if history_text:
        full_prompt = f"Conversation History:\\n{history_text}\\n\\nCurrent Question: {user_message}"

print('Full prompt:', repr(full_prompt))
print()

system_context = "\n".join(context_parts)
print('System context:', repr(system_context[:200]))
print()

answer, error = generate_ai_answer(full_prompt, system_context)
print('Answer:', repr(answer))
print('Error:', repr(error))
