# Research skills

Reusable workflows for literature research, evidence mapping, and interactive research atlases.

## Build Research Atlas

[`build-research-atlas`](build-research-atlas/SKILL.md) turns a research topic or seed paper into a sourced literature map and a self-contained interactive HTML file. It guides an AI assistant through primary-source research; the included Python tools validate and render the collected evidence. The tools do **not** search the literature or verify scientific claims automatically.

- Trace antecedents, extensions, applications, replications, critiques, and alternatives.
- Explain input → output → learning objective before architecture and equations.
- Separate a team's prior research question, the paper's contribution, and later direction.
- Keep paper relationships separate from documented coauthorship and supervision.
- Show cited figures and verified portraits when redistribution is permitted; use explicit unavailable states otherwise.
- Explore glass-style paper and researcher maps: **first click selects and highlights relationships; activate the selected card again to open details**. Search, core/all filters, zoom, keyboard controls, and dialog back navigation are included.

## Install and use

In Codex, ask the built-in installer:

```text
$skill-installer
Install the build-research-atlas skill from
https://github.com/hjjeon-unist/research-skills/tree/main/build-research-atlas
```

If the skill does not appear, restart Codex. Alternatively, copy the complete `build-research-atlas/` directory into your project's `.agents/skills/` folder. See the [official skills guide](https://learn.chatgpt.com/docs/build-skills) for discovery and installation details. This repository is a standalone skill package, not a published plugin listing.

Then invoke it with a topic:

```text
$build-research-atlas
Research JEPA from its original papers through major follow-up studies.
Include antecedents, critiques, alternatives, and the researchers' research context.
Create an English interactive HTML atlas with attributed figures and a researcher map.
Explain inputs, outputs, and learning objectives intuitively, and label uncertain links.
```

한국어로 요청해도 됩니다:

```text
$build-research-atlas
JEPA의 원논문과 주요 후속 연구를 조사해줘.
연구 계보, 비판과 대안, 연구진의 연구 맥락을 정리하고,
출처가 있는 피규어와 연구자 관계도를 포함한 영어 HTML로 만들어줘.
입력·출력·학습 목표를 먼저 설명하고 불확실한 관계는 표시해줘.
```

The assistant needs access to research sources and a Python 3.10+ runtime. The builder uses only the Python standard library; the resulting HTML opens locally in a modern browser without a server, external fonts, or runtime libraries.

## Try the renderer

From the repository root:

```sh
python build-research-atlas/scripts/validate_atlas.py build-research-atlas/examples/demo.json
python build-research-atlas/scripts/build_atlas.py build-research-atlas/examples/demo.json --output outputs/demo.html
python -m unittest discover -s tests -v
```

Open `outputs/demo.html`. The bundled dataset is **entirely fictional**, with reserved example.org links; it demonstrates interactions, not research findings. Replace it using the [data format](build-research-atlas/references/data-format.md) and [research protocol](build-research-atlas/references/research-protocol.md).

Optional browser regression tests require Node.js, Playwright, and its Chromium browser:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.cjs
```

## Files and publication boundaries

`SKILL.md` contains the workflow, `references/` the research and data guidance, `scripts/` the validator and builder, and `assets/` the HTML/CSS/JavaScript template. Keep each real research project outside the installed skill folder. Generated HTML embeds every supplied evidence record and permitted image, so review the output before sharing it.

This public release was reconstructed from the earlier research-atlas workflow and a saved HTML reference; the earlier skill package was unavailable. It is not a byte-for-byte recovery. No original research dataset, paper PDF, figure, portrait, conversation export, or local machine configuration is included. Tests exercise the reconstructed implementation; previous tests described in the original conversation are not claimed as tests of this release.

## License

[MIT](LICENSE), copyright 2026 hjjeon-unist. The license covers the original skill instructions, scripts, template, and fictional fixture in this repository. It does not grant rights to papers, figures, portraits, or other third-party material added to a research project. Record attribution and reuse terms for each such asset; link to the original when reuse rights are unclear.
