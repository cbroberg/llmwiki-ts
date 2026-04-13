# LLM Wiki — Ingest Workflow

## Overview

When a new source is added to a knowledge base, the **ingest cycle** reads it, extracts key information, and compiles it into the wiki. This is the core operation that makes knowledge compound.

A single source typically touches 5–15 wiki pages.

---

## Manual Ingest (via Claude Code)

Open a `cc` session in the project root and paste:

```
Brug llmwiki MCP tools til at ingestere nye sources i "[WIKI_NAME]" wiki'en.

Workflow:
1. Kald `guide` for at se wiki-strukturen
2. Kald `search` med mode "list" for at se alle dokumenter
3. Kald `read` på hver uprocesseret source (dem der IKKE ligger under /wiki/)
4. For hver source:
   a. Skriv en summary-side under /wiki/sources/ med `write` (create)
   b. Identificér nøgle-koncepter, entiteter og personer
   c. Notér hvor ny information bekræfter, udvider eller modsiger eksisterende wiki-sider
5. Opret eller opdatér concept-sider under /wiki/concepts/ for vigtige emner
6. Opret eller opdatér entity-sider under /wiki/entities/ for personer, organisationer, tools
7. Opdatér /wiki/overview.md med `write` (str_replace) så den reflekterer nyt indhold og linker til nye sider
8. Append en ingest-log entry til /wiki/log.md med `write` (append) i formatet:

   ## [YYYY-MM-DD] ingest | Source Title
   - Summary: 1-2 sætninger
   - Pages created: liste over nye sider
   - Pages updated: liste over opdaterede sider
   - Contradictions: eventuelle modsigelser fundet

Hold alle wiki-sider i markdown. Brug [[page-name]] for cross-references.
Sider skal have YAML frontmatter med title, tags og date.
```

### Wiki Directory Convention

```
/wiki/
├── overview.md          # Master overview — always kept current
├── log.md               # Chronological ingest/query/lint log
├── sources/             # One summary per ingested source
│   ├── source-title.md
│   └── ...
├── concepts/            # Topic and concept pages
│   ├── rag.md
│   ├── knowledge-compounding.md
│   └── ...
└── entities/            # People, orgs, tools
    ├── andrej-karpathy.md
    └── ...
```

### Page Frontmatter Template

```yaml
---
title: Page Title
tags: [concept, rag, knowledge-management]
date: 2026-04-13
sources: [source-filename.md]
---
```

---

## Automated Ingest (target architecture)

### Goal

When a user uploads a source via the web UI at http://localhost:3020, the server automatically triggers a Claude Code session that performs the full ingest cycle — no manual intervention.

### Flow

```
User drops file in browser
  ↓
POST /api/v1/knowledge-bases/:id/documents/upload
  ↓
Server stores file, creates document record (status: "pending")
  ↓
Server spawns: claude -p "<ingest prompt>" \
  --allowedTools "mcp__llmwiki__guide,mcp__llmwiki__search,mcp__llmwiki__read,mcp__llmwiki__write" \
  --dangerously-skip-permissions \
  --max-turns 25 \
  --model claude-sonnet-4-5-20250514 \
  --output-format json \
  --no-session-persistence
  ↓
Claude reads source via MCP → compiles wiki pages → updates overview → logs activity
  ↓
Server marks document status: "ready"
  ↓
Web UI reflects new wiki pages in real-time (poll or SSE)
```

### Ingest Prompt Template

The server constructs this prompt dynamically per source:

```
You are the wiki compiler for knowledge base "{kb_name}".

A new source has been added: "{filename}" at path "{path}{filename}".

Your job:
1. Call `read` on the new source to understand its content
2. Call `search` with mode "list" to see the current wiki structure
3. Call `read` on /wiki/overview.md to understand the current state
4. Write a summary page at /wiki/sources/{slug}.md using `write` (create) with:
   - YAML frontmatter (title, tags, date, sources)
   - Key takeaways and findings
   - Cross-references to related concepts/entities
5. For each key concept found:
   - If a concept page exists: read it, then update with `write` (str_replace) to integrate new information
   - If no concept page exists: create one at /wiki/concepts/{slug}.md
6. For each key entity (person, org, tool) found:
   - If an entity page exists: update it
   - If no entity page exists: create one at /wiki/entities/{slug}.md
7. Update /wiki/overview.md to reflect the new knowledge
8. Append to /wiki/log.md:
   ## [{today}] ingest | {title}
   - Summary: ...
   - Pages created: ...
   - Pages updated: ...
   - Contradictions: ...

Be thorough but concise. Every claim should reference its source.
Use [[page-name]] for internal cross-references.
```

### Implementation Notes

- **Process isolation**: Each ingest runs as a separate `claude -p` subprocess (like buddy's transport pattern)
- **Concurrency**: One ingest at a time per knowledge base (queue subsequent uploads)
- **Timeout**: 120 seconds max per ingest
- **Model**: Use `claude-sonnet-4-5-20250514` for speed/cost balance during ingest. User's local Max plan handles billing.
- **Error handling**: If claude exits non-zero, mark document as "failed" with error message
- **Future**: Add Anthropic API key field in settings for users without Max plan. Server calls Claude API directly instead of spawning cc.

### Server-Side Implementation Checklist

- [ ] Add ingest queue (in-memory, one per KB)
- [ ] Add `POST /api/v1/documents/:id/ingest` endpoint to trigger manually
- [ ] Auto-trigger ingest after successful upload of text-readable sources (.md, .txt, .pdf)
- [ ] Spawn `claude -p` subprocess with constructed prompt
- [ ] Parse JSON output for success/failure
- [ ] Update document status based on result
- [ ] Add SSE endpoint for real-time wiki update notifications to web UI
- [ ] Add ingest status indicator in sidebar (spinner on document being ingested)

---

## Query Workflow (manual, for now)

```
Søg i min "[WIKI_NAME]" wiki og besvar dette spørgsmål:

[DIT SPØRGSMÅL]

Workflow:
1. Kald `search` med mode "search" og dit spørgsmål som query
2. Kald `read` på relevante wiki-sider
3. Synthesér et svar med citations til wiki-sider
4. Hvis svaret er værdifuldt, gem det som ny wiki-side med `write` (create)
5. Append query til /wiki/log.md
```

## Lint Workflow (manual, for now)

```
Kør en health-check på min "[WIKI_NAME]" wiki.

Workflow:
1. Kald `search` med mode "list" for at se alle sider
2. Kald `read` på /wiki/overview.md og alle concept/entity-sider
3. Check for:
   - Modsigelser mellem sider
   - Forældede claims som nyere sources har overgået
   - Orphan-sider uden indgående links
   - Vigtige koncepter nævnt men uden egen side
   - Manglende cross-references
4. Opret manglende sider, fix modsigelser, tilføj links
5. Append lint-rapport til /wiki/log.md
```
