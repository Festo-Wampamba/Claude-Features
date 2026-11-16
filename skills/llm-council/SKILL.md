---
name: llm-council
description: >-
  Convene Karpathy's LLM Council: send one question to several frontier models through
  OpenRouter (GPT, Gemini, Claude, Grok). Each one answers, then each anonymously ranks the
  others' answers, and a chairman model writes the final answer. Use when the user says "ask
  the council", "llm council", "get a second opinion from other models", "what do GPT/Gemini/
  Grok think", "compare models on this", or wants a high-stakes answer cross-checked by several
  LLMs. Costs real OpenRouter credits on every run.
---

# LLM Council

Source app: `~/.local/share/llm-council` (github.com/karpathy/llm-council). Launcher: `llm-council` (in `~/.local/bin`).

## Before running

- **It costs money.** One question makes about 9 paid calls (4 answers + 4 reviews + 1 chairman) to premium models. Run it only when the user asked for the council or agreed to it. Never loop it.
- **Needs a key.** `OPENROUTER_API_KEY` in `~/.local/share/llm-council/.env`, or exported. If it is missing, tell the user to add it themself. Never ask them to paste it into chat.
- **Takes a while.** Expect 1 to 3 minutes. Run it with a long timeout (300s).

## Run

```bash
llm-council ask "the question"            # final answer + peer-ranking table (markdown)
llm-council ask "the question" --full     # also every model's answer and every review
llm-council ask "the question" --json     # all stages as JSON, for further processing
```

Put the full context in the question. The council sees only that text, not this conversation or any files.

## Report back

Give the chairman's final answer first, then the peer ranking, then any point where the models disagreed (use `--full` to see it). Say which models sat on the council.

## Other commands

- `llm-council ui`: browser UI at http://localhost:5173 (backend on 127.0.0.1:8001), with saved conversations. Ctrl+C stops both.
- `llm-council models`: show the council and chairman.

## Change the council

Edit `COUNCIL_MODELS` and `CHAIRMAN_MODEL` in `~/.local/share/llm-council/backend/config.py`. Use OpenRouter model IDs; check they exist with `curl -s https://openrouter.ai/api/v1/models | grep '"id"'`. An ID that doesn't exist makes that model drop out silently, and a missing chairman breaks stage 3.
