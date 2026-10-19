---
name: build-research-atlas
description: Research a topic or seed paper and build a cited interactive HTML atlas of literature, mechanisms, and researcher relationships. Use for research lineage maps and visual literature reviews, rather than a single-paper summary or a decorative diagram.
---

# Build a Research Topic Explorer

Create an evidence-backed atlas that helps a reader understand how a research idea works, where it came from, what changed, and what remains disputed. Preserve the user's subject, scope, output language, and destination. Use a concise `Research Topic: <topic>` heading, with English/Korean controls at the top. Default to English unless the user chooses otherwise; keep the conversational explanation in the user's language.

## Establish and research the scope

Start from the supplied topic or seed paper. State the review date and a practical inclusion boundary; ask only when an ambiguity would materially change the literature set. Use available search/browser/connectors, without assuming a particular provider. Read [research-protocol.md](references/research-protocol.md) before collecting evidence.

Build a source ledger while reading primary papers, official proceedings, project pages, and institutional researcher profiles. Record what was actually read: full text, abstract, or metadata. Follow antecedents and citing work into extensions, applications, replications, critiques, and alternatives; include a branch only when the evidence supports it. Record search queries, exclusions, and known gaps. If source access is missing, report the limitation and produce a clearly bounded draft, not invented citations.

For every selected paper, distinguish its question, contribution, findings, limitations, and team context (before → this work → after). Explain **input → output → learning objective/loss** before implementation details. Mark a non-learning study's objective as not applicable with an explanation. Attribute claims to specific sources and locations; keep reported results distinct from your interpretation.

Each paper edge needs a typed relationship, a plain-language explanation, and evidence. Label inferred conceptual links. Do not derive supervision, PI status, influence, or affiliation from author order, shared institutions, or similar topics. Maintain a separate researcher graph with verified roles and sources. Use sourced real portraits when available and permitted; never synthesize a person's likeness as documentary evidence.

## Assemble and render

Read [data-format.md](references/data-format.md). Create a project-specific JSON dataset outside the installed skill. Use [examples/demo.json](examples/demo.json) only as a **fictional structural example**, never as literature evidence.

Choose informative source figures and record their origin, figure number, credit, and reuse terms. Embed only permitted local raster assets. If rights or identity cannot be confirmed, omit the asset and retain the source link and unavailable message. Keep downloaded papers and private notes in the research project, not in this reusable package.

Run these commands with paths resolved relative to this skill directory:

```sh
python scripts/validate_atlas.py /path/to/project/atlas.json
python scripts/build_atlas.py /path/to/project/atlas.json --output /path/to/project/atlas.html
```

Set `topic` to a short subject name. Supply `translations.ko` for every user-facing explanation: paper questions, findings, limitations, mechanisms, team context, researcher profiles, relationship explanations, and scope. Preserve formal paper titles, author names, identifiers, URLs, and quoted source metadata unless the user requests their translation. Translation is authored and checked during research, not fetched from a runtime service. The built-in catalog translates controls; missing content entries remain in their source language and must be reported as incomplete.

Keep the landing view minimal: topic heading, compact counts/date, tabs, and controls. Omit branding such as “Research Atlas”, promotional subtitles, abstract motivating questions, and paragraphs teaching users how to click. Put research substance and caveats in detail/scope views. Use concise action labels, visible selection state, and accessible names.

The supplied template provides paper and researcher maps, mechanisms, a paper index, and a source/scope view. Its visual default is restrained glass styling: translucent navigation and controls, readable content surfaces, soft borders, and reduced-motion support. Adapt the layout when the subject benefits, retaining evidence access and these interaction invariants:

- First click/tap or Enter/Space selects a card and highlights its direct relationships. Activating the selected card again opens details; thumbnails follow the same rule.
- Language changes update text in place, preserve interaction state, and are remembered when browser storage is available. Verify both languages, translated search, and exact return to the source text.
- Closing details preserves selection, graph scroll, and zoom. Nested researcher details return to the original paper and reading position.
- Show total versus hidden relationships under filters, with a way to reveal all links.
- Escape closes the top dialog or clears map selection. Provide visible keyboard focus, meaningful image alt text, and mobile scrolling without page overflow.

## Validate and deliver

Use [acceptance.md](references/acceptance.md) for evidence review and browser checks. The structural validator checks references and permitted asset paths; it cannot prove that a claim is true or that image reuse is lawful. Inspect actual sources and the rendered result.

Deliver the HTML and, when useful, the editable JSON and source ledger. Report the search cutoff, coverage gaps, and tests actually performed. Publishing a research atlas or changing external repositories requires authorization from the current user request; invoking this skill alone does not authorize publication.
