---
name: figma-data-visualization
description: Design or review information and data dashboards in Figma using explicit audience questions, metric definitions, chart-selection rules, accessible encodings and editable components. Use for dashboard briefs, Figma dashboard creation or revision, and evidence-based dashboard design audits.
---

# Figma Data Visualization

Turn data and a decision brief into an editable Figma dashboard that supports accurate interpretation. Preserve the user's intent and the actual meaning of every number. This repository combines Bear's 100-rule and 142-rule documents with a Figma design workflow.

## Begin with the decision

Read [the rulebook](references/rulebook.md). Establish the primary audience, ranked questions, dashboard type, decision cadence, device and next action. If known from the conversation, record them and continue. Ask only for information that materially blocks a useful design. Use `./fdv init <workspace>` for a synthetic example; never pass its numbers off as user data.

Build a metric dictionary before chart selection: formula, numerator/denominator, grain, population/exclusions, aggregation, source, owner, units, observation period, timezone, freshness, caveats and definition version. Reconcile representative values independently. Unknown values stay unknown. Distinguish a percentage-point change from relative change and label undefined change from zero.

## Choose the design from the questions

Give each panel a question ID and a reason for its chart type. Tables are first-class. Prefer aligned position for precise comparisons, line charts for time, distributions when spread matters, and maps only when geography matters. Bars encoding magnitude include zero; time spacing and gaps remain truthful. Every headline value has a named comparison, a trend when meaningful, and units.

Define visible filter scope, reset, drill-down/back behavior, export context and the initial answer before styling. Plan default, empty, no-source-data, loading, error, partial, stale and denied states. Use `./fdv check <spec>` for the supported starter specification; record human judgments separately from machine findings.

## Draw in Figma

Read [the Figma workflow](references/figma-workflow.md) before connecting or writing. Discover the available tools, target file, pages, libraries, components, variables and conventions. Use current installed Figma skill guidance; never assume a read-only connector can draw. For an existing file, respect its approved design system and the user's authorized scope. Record the request before a write and save all affected IDs and relevant before-values afterward.

Build a component kit and Auto Layout structure, then compose the dashboard with visible data context. Bind semantic colors and typography to variables; distinguish UI accent, categorical, sequential, diverging and status roles. Do not apply App Designer's single-accent rule blindly to categorical data. Keep essential labels, warnings and units on-canvas. Load fonts before every text mutation. Review one composition screenshot and take a replacement only after a visual correction.

`./fdv figma <spec> --out <file>` generates a new-page starter for KPI/bar/line/table designs. It draws native layers from computed values and returns a receipt. It is not a complete interactive application, does not wire data refresh, and does not adopt an existing design system automatically. Use the agent workflow for other chart types or existing component libraries.

## Review and deliver

Use `./fdv measure <receipt> --out <file>` to generate a read-only measurement body for your recorded frames; then `./fdv audit <measurements>`. Read [validation limits](references/validation.md). Separate numerical/essential-accessibility/permission release requirements, contextual design concerns, and house-style deviations. Cite rule IDs with evidence and severity. Do not hide a failed rule behind a composite score.

Deliver Figma links, page/node IDs, metric definitions, calculations, state and interaction contracts, source provenance, findings, explicit exceptions and untested requirements. `./fdv handoff` creates a draft checklist, not an approval. A Figma drawing cannot verify keyboard support, screen-reader announcements, server permissions, query race handling, exports or real-user comprehension. Name the implementer and leave those checks pending until observed.

Explicit user approval in the current conversation is valid authorization for its stated scope; record it accurately instead of making the user repeat it in a special terminal command. Never invent approval or treat a revision request as approval of an unrelated design. Keep production publishing separate from making a reviewable design.
