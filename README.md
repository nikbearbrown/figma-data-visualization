# Figma Data Visualization

Design information and data dashboards in Figma from explicit audience questions, trustworthy metric definitions, and a traceable rulebook.

This is an agent skill plus a small, dependency-free command-line toolkit. It preserves Bear's two supplied documents: **100 rules (A1–A100)** and **142 rules (R1–R142)**. It adds a Figma workflow informed by [figma-appdesigner](https://github.com/nikbearbrown/figma-appdesigner): variables, reusable components, auto-layout, recorded requests, measured findings and a concrete handoff.

Type **help** in agent chat with this skill active, or run `./fdv help` in a terminal. It explains the toolkit and points to the [practical tutorial](tutorial/README.md).

## Start

Requires Python 3.10+. Node.js 18+ is needed only for renderer contract tests. Actual drawing requires a Figma Design file and an authorized Figma integration supporting Plugin API execution; the CLI itself does not log in or send data to Figma.

```sh
./fdv help
./fdv tutorial
./fdv init /tmp/my-dashboard
./fdv rules R68
./fdv check /tmp/my-dashboard/dashboard.json
./fdv figma /tmp/my-dashboard/dashboard.json --out /tmp/my-dashboard/draw.js
```

Open this repository in Claude Code or Codex and ask:

> Read SKILL.md. Design a dashboard for program managers to identify overdue submissions. Use my data and Figma design system, cite the rules behind your choices, draw the important states, and report what still needs real-user and runtime testing.

`init` creates a clearly labeled **synthetic demo**, not a production brief. Replace the questions, records, metric definitions and labels before designing your own dashboard. It never overwrites an existing destination. For an existing Figma file, use its components and tokens through the agent workflow. The generated starter script creates a new page and fresh local components; it does not replace existing design-system components.

## What it creates

- A question-to-panel plan and metric dictionary in `dashboard.json`.
- Native, editable Figma text, shapes, variables, a reusable panel component and instances. The starter renderer supports **KPI, bar, line and table** panels; other charts are designed through the agent workflow, not silently approximated.
- Default, loading, empty, no-source-data, error, partial, stale and denied states. Stale/partial states retain context and values; failed or denied states never show a valid zero.
- A write receipt with node IDs, metric values, page ID and token IDs; read-only measurement script and an audit report.
- A handoff draft that separates design evidence from production verification.

```sh
./fdv measure /tmp/my-dashboard/receipt.json --out /tmp/my-dashboard/measure.js
# Run measure.js through the authorized Figma integration; save returned JSON.
./fdv audit /tmp/my-dashboard/measurements.json
./fdv handoff /tmp/my-dashboard/dashboard.json --out /tmp/my-dashboard/handoff.md
```

The generated scripts are **MCP execution bodies** with top-level `await`/`return`, not browser scripts or a stand-alone Figma plugin. Follow [the Figma workflow](references/figma-workflow.md) before executing them. Save tool returns as JSON without guessing IDs. A timeout may have drawn part of a page: inspect the canvas before retrying; never blindly rerun a creation script.

## Rules and evidence

[Rulebook and crosswalk](references/rulebook.md) · [all 242 indexed rules](references/rules.json) · [original documents](references/sources/) · [Figma workflow](references/figma-workflow.md) · [specification](references/specification.md) · [validation limits](references/validation.md).

`check` validates the design specification and calculates values; it does not certify source truth, accessibility, permissions or production readiness. `audit` inspects supplied Figma measurements; it cannot establish keyboard or screen-reader behavior from a drawing. Human review and implementation tests remain explicit.

## Test

```sh
python3 -m unittest discover -s tests -v
node --test tests/renderer.test.js
```

The tests exercise numerical integrity, invalid specs, missing values, negative bars, unequal time spacing and Figma API ordering through a test double. A live Figma end-to-end run is **not yet verified**. See `references/validation.md` for the exact boundary.

Repository names use lowercase kebab-case: **figma-data-visualization**.
