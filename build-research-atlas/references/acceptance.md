# Review before delivery

## Evidence

- Sample every branch, the seed work, and important disputed claims against original sources. Match titles, years, venues, identities, and paper versions.
- Inspect every graph edge's explanation and source; distinguish documented relationships from inference.
- Confirm role/affiliation time context and supervision evidence. Do not equate author order with PI status.
- Check input/output/loss descriptions, training versus inference, and team context chronology.
- Check each embedded figure/portrait against its source and attribution/reuse record.
- State search cutoff, selection method, abstract-only coverage, exclusions, and unresolved gaps.

## Artifact behavior

Run the validator and builder. In a browser check the real data, not only a fixture:

- No errors on load; titles, citation links, mechanism text, and images render.
- First card activation highlights neighbors without opening a dialog; second opens details. Test mouse, touch, Enter, and Space, including image regions.
- Core/all filtering and search report hidden connections. Reveal-all clears the limiting filters.
- Closing details preserves map selection, zoom, and position. Paper → researcher → back preserves the paper's reading position and focus.
- Escape, clear selection, focus indicators, zoom controls, and keyboard tab navigation work.
- At approximately 390 px width, controls wrap and graphs scroll internally; long titles remain readable. Reduced-motion users do not receive expansion animation.
- On larger datasets, inspect cross-year links and crowding. Adjust the template when the graph becomes hard to follow; no fixed count guarantees a readable map.

Report the checks actually performed. A valid JSON document does not establish scientific accuracy, and passing the synthetic UI fixture does not establish the quality of a real literature review.
