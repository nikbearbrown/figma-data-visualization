# Rulebook and reconciliation

Both source documents are preserved verbatim in sources/. `rules.json` indexes the first document as A1–A100 (its original numbers 1–100) and the second as R1–R142. It does not replace the full documents: introductions, chart-selection tables, Part 17's qualifications, the checklists and references are also guidance.

## Crosswalk

| Decision | Original | Comprehensive |
|---|---|---|
| Purpose, audience, context, action | A1–A7 | R1–R8 |
| Dictionary, grain, comparisons, precision | A8–A15 | R9–R18, R31–R39, R94–R96 |
| Numerical and statistical integrity | A16–A24 | R16–R30, R129–R133 |
| Chart selection and geometry | A25–A39 | R51–R76 |
| Layout and typography | A40–A47 | R40–R50, R91–R103 |
| Color and annotation | A48–A55 | R77–R99 |
| Interaction and reproducibility | A56–A64 | R104–R114 |
| Accessibility | A65–A73 | R84–R88, R114, R119–R123 |
| Freshness, states, performance | A74–A81 | R19–R22, R103, R112, R124–R128 |
| Alerts and ownership | A82–A87 | R6, R115–R118, R141 |
| Permissions, disclosure, lifecycle | A88–A92 | R30, R131–R142 |
| AI claims and testing | A93–A100 | R133–R142 |

## Apply evidence and context

- **Integrity requirements:** computed values, units, denominators, valid comparisons, explicit missingness, source truth, and permissions. Incorrect metrics or unauthorized data block production release.
- **Accessibility requirements:** use WCAG 2.2 AA criteria with their scopes and exceptions. Figma measurements are design evidence only; runtime and human tests are required.
- **Heuristics:** panel counts, density, scrolling, type counts, limited hues, chart preferences and timing heuristics. Record a concern and its tradeoff; do not claim universal laws.
- **House rules:** naming, spacing, chosen palette and workflow conventions. Record a deviation when relevant; user intent can justify changes.

## Resolve differences explicitly

1. **Bars:** A31 distinguishes ordinary magnitude bars from Gantt/range intervals. R68's absolute wording applies to magnitude bars. The starter renderer draws magnitude bars only and enforces a zero-inclusive domain. It does not reject an interval chart merely for not starting at zero.
2. **Thresholds:** R115 recommends variation-based limits; A83 distinguishes targets, specifications and statistical control limits. Keep all three available and name their type, owner and rationale. A contractual SLA is not invalid because it is not derived from historical variation. Never relabel a target as a control limit.
3. **One screen / five seconds:** context-dependent for monitoring; analytical and narrative dashboards may scroll. Never shrink required text or remove warnings to fit. Validate with audience tasks.
4. **Pies, gauges, dual axes, palettes:** defaults and cautions, read together with Part 17. Require a concrete reason for a specialist choice instead of silently substituting a different relationship.
5. **Progress / causal statements:** require observable completion and causal evidence respectively; a sequence arrow or explanatory title can overclaim even when numbers are correct.
6. **Touch targets:** A70's 24 CSS-pixel criterion includes spacing and other exceptions; R123 is shorthand. Use generous design targets, but do not report every undersized object as a WCAG failure. Figma pixels are design units, not observed CSS pixels on a device.
7. **KPI gaps and change:** label absolute gap, percentage points and relative percent separately. A zero reference gives undefined ordinary relative change; show the absolute difference.
8. **Palette roles:** App Designer's single accent is useful for UI actions, but charts legitimately need semantic categories and quantitative scales. Keep role namespaces and stable mappings; essential status also has words or symbols.
9. **Approval:** record real user decisions and their scope. Do not import the reference tool's command-only approval mechanism as a new restriction on the user.

## Figma production rules

F1 inspect the authorized file and design system first. F2 load fonts before text mutations. F3 use Auto Layout for related children; chart marks may use quantitative coordinates inside a plot frame. F4 use variables for semantic paints and fonts. F5 reuse components/instances. F6 scope mutations by known IDs; record before-values. F7 return all created/mutated IDs and save a receipt outside the canvas. F8 inspect uncertain writes before retrying. F9 verify structure and one composition screenshot. F10 distinguish editable design from implemented behavior and production accessibility.

Reference workflow: nikbearbrown/figma-appdesigner at d46ea07f93aa9b2183a38bfa7ed6a3d90eb5cdd2. The implementation here is new; no end-to-end validation is inherited from that project.

Primary references checked 2026-11-14:
- [Figma Plugin API variables](https://developers.figma.com/docs/plugins/api/figma-variables/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Target size minimum and exceptions](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

The research bibliography in the second supplied document is retained as supplied; every cited paper has not been independently re-reviewed in this build.
