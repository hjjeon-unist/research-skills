# Atlas JSON format (version 1)

UTF-8 JSON, plain text strings (no HTML/Markdown rendering). Start from `../examples/demo.json`. The validator rejects unknown fields to catch misspellings and avoid accidentally embedding private extra metadata. All IDs use lowercase letters, digits, and hyphens, beginning with a letter. IDs must be unique within a collection.

## Root

Required fields:

| Field | Meaning |
| --- | --- |
| `version` | Integer `1` |
| `title`, `summary` | Display title and concise research question/summary |
| `language` | HTML language tag, e.g. `en` or `ko` (UI labels remain English) |
| `as_of` | Real date, `YYYY-MM-DD` |
| `scope` | Object described below |
| `sources` | Nonempty source ledger |
| `papers` | Nonempty paper array |
| `researchers`, `edges`, `researcher_edges` | Arrays; may be empty |

Optional `demo: true` displays a fictional-data banner. Do not use this flag on real research.

`scope` requires `inclusion`, `exclusions`, `gaps`, and `queries`, all arrays of nonempty strings. Empty arrays are allowed, but record actual gaps instead of hiding them. Queries should name the search venue, query, and date. Optional `review_type` describes the review method.

## Sources and claim evidence

Each source: `id`, `title`, `url` (public HTTPS or HTTP, no credentials), `accessed` (date), and `read` (`full-text`, `abstract`, `metadata`, or `profile`). Optional `locator` is a page/section/figure note. Use separate source entries for different passages when precision helps.

An evidence object is `{ "text": "A specific claim.", "sources": ["source-id"] }`. At least one valid source is required. Used for findings, limitations, team context, and verified roles. Unknown information can be stated as unavailable in ordinary fields or omitted from optional evidence arrays; do not fabricate a source for absence of evidence.

## Papers

Required: `id`, `title`, `year` (integer 1000–3000), `venue`, `authors` (nonempty string array), `category`, `core` (boolean), `url`, `question`, `contribution`, `mechanism`, `findings`, `limitations`, `sources`, `researcher_ids`, and `team_context`.

- `category`: `antecedent`, `original`, `extension`, `application`, `replication`, `critique`, or `alternative`.
- `sources`: nonempty source ID array grounding bibliography, question, contribution, and mechanism.
- `researcher_ids`: IDs of the selected researchers represented in the people graph, not necessarily every author. Author names remain in `authors`.
- `mechanism`: required strings `input`, `output`, `objective`; optional strings `architecture`, `loss`. Use plain text/Unicode math; no LaTeX renderer is loaded.
- `findings`, `limitations`: arrays of evidence objects (may be empty when the source supports no reliable extraction; describe that gap in `scope.gaps`).
- `team_context`: optional evidence keys `before`, `current`, `after`; empty object allowed.
- Optional `figure`: media object below.

## Researchers

Required: `id`, `name`, `context`, `affiliation_at_study`, `roles` (evidence array), and nonempty `sources`. Optional `portrait`: media object. Papers determine the person's linked studies, so there is no duplicated paper list to keep synchronized. Use `roles: []` when a role is unverified.

## Edges

All edges require `id`, `from`, `to`, `type`, `explanation`, `confidence` (`documented` or `inferred`), and nonempty `sources`. Endpoints must exist and cannot be identical.

`edges` connects paper IDs with types `antecedent`, `extension`, `application`, `replication`, `critique`, or `alternative`. `researcher_edges` connects researcher IDs with types `coauthor`, `supervision`, or `collaboration`; these personal relationships must be `documented`. Distinguish an analyst's conceptual comparison using a paper edge rather than an inferred personal relationship.

## Optional local media

`figure` and `portrait`: required `path`, `alt`, `caption`, `source_url`, `credit`, `license`, and `reuse_confirmed: true`. Paths are relative to the JSON file's directory. Absolute paths, traversal, symlink escapes, remote URLs in `path`, and active formats such as SVG are rejected. Supported formats are PNG, JPEG, GIF, and WebP, at most 8 MiB each and 32 MiB total. The builder checks file signatures and embeds data URLs; it never downloads media. The confirmation is an author assertion, not automatic legal verification.

When reuse permission is absent, omit the media object. Put a public original figure/profile link in the source ledger instead. No image binary is required for a valid atlas.
