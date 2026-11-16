"""Run Karpathy's LLM Council headlessly: stage 1 answers, stage 2 anonymous peer ranking, stage 3 chairman synthesis.

Usage: llm-council ask "question" [--json] [--full]
"""
import argparse
import asyncio
import json
import os
import sys

APP_DIR = os.environ.get("LLM_COUNCIL_HOME", os.path.expanduser("~/.local/share/llm-council"))
# backend/config.py loads .env and stores conversations relative to the cwd, so run from the app dir.
os.chdir(APP_DIR)
sys.path.insert(0, APP_DIR)

from backend import config  # noqa: E402
from backend.council import run_full_council  # noqa: E402


def to_markdown(question, stage1, stage2, stage3, meta, full):
    out = [f"# LLM Council\n\n**Question:** {question}\n", f"## Final answer (chairman: {stage3['model']})\n\n{stage3['response']}\n"]
    ranks = meta.get("aggregate_rankings") or []
    if ranks:
        out.append("## Peer ranking (lower is better)\n\n| model | avg rank | votes |\n| --- | ---: | ---: |")
        out += [f"| {r['model']} | {r['average_rank']} | {r['rankings_count']} |" for r in ranks]
        out.append("")
    if full:
        out.append("## Stage 1: individual answers\n")
        out += [f"### {r['model']}\n\n{r['response']}\n" for r in stage1]
        out.append("## Stage 2: peer reviews\n")
        out += [f"### {r['model']}\n\n{r['ranking']}\n" for r in stage2]
    return "\n".join(out)


def main():
    p = argparse.ArgumentParser(description="Ask the LLM Council (OpenRouter).")
    p.add_argument("question", nargs="+")
    p.add_argument("--json", action="store_true", help="print all stages as JSON")
    p.add_argument("--full", action="store_true", help="include stage 1 answers and stage 2 reviews in markdown")
    a = p.parse_args()
    if not config.OPENROUTER_API_KEY:
        sys.exit(f"OPENROUTER_API_KEY not set. Put OPENROUTER_API_KEY=sk-or-v1-... in {APP_DIR}/.env or export it.")
    question = " ".join(a.question)
    stage1, stage2, stage3, meta = asyncio.run(run_full_council(question))
    if not stage1:
        sys.exit(f"Council failed: {stage3.get('response')} Check the key, credits and model IDs in {APP_DIR}/backend/config.py.")
    if a.json:
        print(json.dumps({"question": question, "stage1": stage1, "stage2": stage2, "stage3": stage3, "metadata": meta}, indent=2))
    else:
        print(to_markdown(question, stage1, stage2, stage3, meta, a.full))


if __name__ == "__main__":
    main()
