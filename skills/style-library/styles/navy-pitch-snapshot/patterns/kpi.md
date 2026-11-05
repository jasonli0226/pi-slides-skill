# Pattern: kpi

Row of 3–4 metric cards. Use `layout-kpi` (flex) — not a grid of absolute boxes.

## Structure

```tsx
<div className="layout-kpi">
  <Kpi label="NPS" value="72" delta="+4" />
  <Kpi label="Uptime" value="99.95%" />
  <Kpi label="Seats" value="1.2M" delta="QoQ" />
</div>
```

## Lint

- One idea per card; avoid wrapping long sentences inside KPI values.
- Pair with a short slide title; do not stack two KPI rows without `layout-stack`.
