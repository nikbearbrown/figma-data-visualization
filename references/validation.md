# Validation and honest limits

## Checked locally — 14 November 2026

- `python3 -m unittest discover -s tests -v`: 14 tests passed.
- `node --test tests/renderer.test.js`: 8 tests passed.
- Skill creator `quick_validate.py`: Skill is valid.

The generated draw → receipt → measure → audit sequence was executed against a behavioral API test double. It is not Figma layout emulation.

- Complete source numbering: A1–A100 and R1–R142; original source hashes preserved.
- Metric math: pooled rates, missing observations, zero denominator, finite values and percent versus percentage points.
- Specification: required dictionary/context, unique references, supported panel types, states, comparison labels, ordering and theme contrast.
- Renderer contracts through a Figma API test double: font load ordering, returned IDs, variable-bound paints, negative-bar geometry, proportional time spacing and missing-data gaps.

## Not established by those checks

- A real Figma run, render screenshot or measurements in a particular file/seat. The renderer is a tested starter, not live-verified integration.
- Truth of source records, correctness of joins, timezone eligibility, statistical inference or independent reconciliation of panel series.
- Keyboard operation, screen-reader semantics, WCAG conformance, zoom/reflow, actual CSS target spacing, query permissions, privacy suppression, stale-query races, refresh controls or export parity.
- Representative-user comprehension, runtime speed, usage or successful maintenance.

`fdv check` emits machine findings with rule IDs and returns nonzero for failures. A pass means only that the supported specification checks passed. `fdv audit` measures solid-paint contrast, clipping/bounds and missing IDs from supplied Figma measurement evidence. Unmeasured checks are named, not passed. Human judgments about chart appropriateness, ambiguity and decisions remain concerns with stated evidence.

Production release requires independent numerical reconciliation, implemented accessibility and permissions, worst-case data tests, task-based user testing, and an owner/review date. Drafts can be reviewed before those exist; never label them production-ready.

The audit requires the exact unique `nodeIds` set from a saved receipt. Missing IDs fail; absence of receipt coverage is an input error. Receipts are user-supplied evidence, not cryptographic proof of a Figma run. The measurement script resolves color variables for each consumer using the [Figma variable API](https://developers.figma.com/docs/plugins/api/properties/Variable-resolveforconsumer/). Mixed, translucent, overlapping or unresolved paints remain unmeasured. It uses the conservative 4.5:1 text threshold except at 24 px and above (3:1); it does not infer bold-font exceptions or check nontext contrast.
