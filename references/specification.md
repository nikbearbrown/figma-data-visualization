# Starter specification

`examples/program-operations.json` is the executable example. `fdv init <directory>` copies it as dashboard.json. All examples are synthetic and visibly labeled.

Required fields: title, audience, purpose, type (operational/strategic/analytical/narrative/personal), owner, period, as_of, refreshed_at, timezone, data_kind (synthetic/real), questions (unique id/text), records, metrics, panels, states, filters, theme.

Each metric has id, name, formula, unit, grain, population, exclusions, source, owner, aggregation, definition_version, caveats and direction (higher/lower/neutral/range). Supported deterministic aggregations:

- sum/mean: `field` names a numeric field; null observations are excluded and counted as missing. No observed values produces null, never zero.
- count: number of records, with the stated grain and population.
- rate: `numerator` and `denominator` name nonnegative numeric fields. Pool underlying components, never average group rates. Rows missing either component are excluded and counted; zero pooled denominator produces null. A rate metric's unit is percent.

Each panel has id, question_id, metric_id, title, chart (kpi/bar/line/table), rationale, summary, and definition label. A KPI has a named comparison and a series for trend context. Bar/line/table panels have `series: [{label, value, ...}]`. Null values remain missing. Time line points also have `YYYY-MM-DD` dates (interpreted at UTC midnight), or offset datetimes with seconds and optional millisecond precision, as `date` values in increasing order. Starter series are supplied design data; check validates their shape and consistency of supported invariants, not their lineage to source records. Reconcile them separately before real use.

Bars include zero in their domain; they support negative values. Lines position time proportionally, break paths at nulls and show a range label; cropped line domains are explicit. Tables retain exact display values. All text uses the metric's unit. Data values must be finite numbers or null, never numeric strings or booleans.

Required states: default, loading, empty, no-source-data, error, partial, stale, denied. Filters carry id, label, value, scope (panel IDs or all), combination (AND/OR), and reset; starter controls are visual annotations, not working filters. Unknown chart types fail with an explicit error.

Theme: six-digit hex tokens background, surface, text, muted, accent, border, warning; font_family and font_style. Defaults use neutral surfaces, dark readable text and a blue quantitative accent. Supply the target brand's actual tokens; do not invent logo permissions.

A screenshot or a passing specification check does not verify the data source or production app. See validation.md.

Datetime fields use explicit offsets; `timezone` is a valid IANA identifier. The starter does not infer eligibility from a timezone or change source dates. Relative change uses the magnitude of the previous value as its denominator; zero makes it undefined. Rescale units if aggregates, domains or comparisons overflow.
