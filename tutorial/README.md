# Your first data visualization dashboard

Build a synthetic program-operations dashboard with KPI, bar, line and exact-value table panels. The example asks which teams need follow-up and shows 84 resolved cases out of 100 eligible cases: **84%**, compared with **80%** previously. That is **4 percentage points**, or **5% relative growth**. These are demonstration data.

## 1. Get help

In a conversation where this skill is active, type `help`. In a terminal opened at this repository, run:

```sh
./fdv help
./fdv tutorial
```

Bare `help` in your shell is usually a shell command; it does not invoke this toolkit. No Figma login or connection is needed for the local steps. Python 3.10+ is required. Drawing later requires an authorized Figma Design file and a connector that executes the Plugin API.

## 2. Create a separate workspace

Choose a new directory; the command refuses to overwrite one that exists.

```sh
./fdv init /tmp/my-dashboard
./fdv check /tmp/my-dashboard/dashboard.json
```

Expected: `ok: true`, computed value `84.0`, numerator `84`, denominator `100`. Open `dashboard.json`. Read the audience, purpose, questions, records and metric dictionary. Keep `data_kind: synthetic` until you supply real data and independently reconcile it. The series in individual panels are supplied separately; checking the spec does not prove they match your data source.

Try replacing a line point's value with `null`, or a bar value with a negative number. Missing data must stay missing; negative bars must share a zero baseline. Run `check` after changes. Changing only records will update the KPI calculation, but you must also update and reconcile the supplied panel series and prose summaries.

## 3. Review the rules and create a drawing script

```sh
./fdv rules R68
./fdv figma /tmp/my-dashboard/dashboard.json --out /tmp/my-dashboard/draw.js
```

The output is an MCP execution body, not a browser script or a directly runnable Node program. It creates a new page with native editable layers, variables, a reusable panel heading, and eight illustrative states. It does not create a Figma file, authenticate, execute the script, or wire working filters.

Tell your agent:

> Read SKILL.md and references/figma-workflow.md. Use my authorized Figma Design file [paste the file link]. Inspect its pages first, then run /tmp/my-dashboard/draw.js once on a new page. Save the actual return object as /tmp/my-dashboard/receipt.json. Do not invent IDs. Show me the default and missing-data states and report any visual defects.

If you need an existing design system, have the agent compose with its components instead of blindly running this standalone starter. If execution times out, inspect the canvas before retrying: creation is not idempotent.

## 4. Measure and inspect

Once the actual receipt is saved:

```sh
./fdv measure /tmp/my-dashboard/receipt.json --out /tmp/my-dashboard/measure.js
```

Ask the agent to run that read-only body in the same file and save its actual return as `/tmp/my-dashboard/measurements.json`. Then:

```sh
./fdv audit /tmp/my-dashboard/measurements.json
```

The audit requires receipt ID coverage and reports missing nodes, solid text contrast and bounds concerns. Mixed or unresolved measurements stay unmeasured. Inspect screenshots for clipping, labels, time spacing and all states. Passing this audit does not establish keyboard support, screen-reader behavior or production accessibility.

## 5. Deliver a reviewable handoff

```sh
./fdv handoff /tmp/my-dashboard/dashboard.json --out /tmp/my-dashboard/handoff.md
```

Fill in actual Figma links, receipt, numerical reconciliation, screenshots, decisions and untested requirements. Leave unavailable evidence pending. Generated files are never overwritten; choose a new filename for each revision.

For your own dashboard, replace the audience, questions, metric definitions, records, panel series and context together. Read [the schema](../references/specification.md), [rulebook](../references/rulebook.md), [Figma workflow](../references/figma-workflow.md) and [validation limits](../references/validation.md).
