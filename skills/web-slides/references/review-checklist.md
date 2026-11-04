# Self-review checklist

Run `npm run review`, then go through this list with the screenshots open. Every box must be true before export.

## Automated (from review/report.md; must be 0 errors)

- [ ] `frame`: every slide uses SlideFrame.
- [ ] `title-sentence`: titles have 5 or more words and end with punctuation.
- [ ] `source-missing` / `cite-unknown`: every Stat, BarChart and Quote cites a source listed on that slide.
- [ ] `leftover`: no lorem, TODO, TBD, FIXME, placeholder, `{{ }}`, undefined or NaN.
- [ ] `emoji-icon`: no emoji.
- [ ] `off-stage`, `footer-overlap`, `clipped`: nothing spills off the stage, into the footer, or out of a container.
- [ ] `tiny-text`: nothing under 18px, including chart and diagram text.
- [ ] `contrast`: solid-background text meets 4.5:1 (3:1 if large).
- [ ] `render` / console: no Mermaid or Shiki errors and no runtime errors.
- [ ] `npm run check:tokens` passes for the theme in use.

## Visual (you judge, from the PNGs)

- [ ] Reading only the titles in order tells the whole story.
- [ ] Each slide has one focal point, and the accent color is used on that point only.
- [ ] Alignment: left edges line up across slides; cards in a row have equal heights; nothing looks accidentally off-center.
- [ ] There's enough whitespace: no slide feels crammed (over 40 words is a smell).
- [ ] Gradient text and text over glows are clearly readable, since the lint can't measure these.
- [ ] Icons are all lucide with the same stroke, and the same concept uses the same icon everywhere.
- [ ] Charts are labelled with units and timeframes, start at zero, and highlight the bar the title mentions.
- [ ] Diagrams have 8 nodes or fewer, labels aren't cut off, and arrows read left-to-right or top-to-bottom.
- [ ] The technical deck includes architecture, results, governance and lessons slides.
- [ ] The final slide has a clear ask or next step and lists references.

## Facts

- [ ] Every number appears verbatim in a source you opened. Re-open the source if you're unsure.
- [ ] Every quote is verbatim and attributed.
- [ ] Nothing is `illustrative` unless the user agreed, and the notes say why.
- [ ] Example slides and example sources from the template are deleted.

## Motion (run `npm run dev` or `review -- --steps`)

- [ ] Click steps reveal in a logical order, and the step count matches `steps`.
- [ ] No more than 2 or 3 transition kinds are used, and nothing animates in a loop over content.
