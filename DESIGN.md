# Design: Readie Candidate Integrity & Audit Portal

The user is an auditor deciding whether a candidate's session can be trusted. Every screen should answer "what is the verdict, and what is it based on?" before anything else.

## Principles

1. **Verdict first, evidence second.** The status tag and the reason for it sit above the fold; observations, transcripts and limitations follow in that order.
2. **Say what the data says.** Labels use the API's own vocabulary where the spec's vocabulary has no matching field. Derived values and thresholds are named constants, labelled as such in the UI.
3. **Absence is information.** "Not yet analysed", "no flags raised" and "no candidates in this campaign" are designed states with their own copy, never blank space.
4. **Calm by default, loud only for risk.** Neutral surfaces and one accent. Colour appears where the auditor's attention is needed, always paired with an icon and a word.
5. **The URL is the view.** Campaign, filters, sort, room and tab are all addressable, so anything an auditor sees can be sent to a colleague.
6. **Thumb-first on mobile.** Controls sit in reach, targets are 44 px or more, and dense tables become scannable cards rather than shrunken tables.

## Tokens

**Colour.** Neutral base with Readie's violet as the single accent. Hue is never the only signal.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FAFAFB` | `#07070F` | page (dark takes Readie's navy-black) |
| `surface` | `#FFFFFF` | `#0E0E1A` | cards, table, sheets |
| `surface-sunken` | `#F3F3F6` | `#141424` | interviewer rows, table header, wells |
| `border` | `#E4E4EA` | `#23233A` | hairlines |
| `border-strong` | `#C9C9D3` | `#34344F` | inputs, button lower edge |
| `text` | `#15151F` | `#EDEDF3` | primary text |
| `text-muted` | `#5C5C6E` | `#9A9AAD` | secondary text, timestamps |
| `accent` | `#6A3DF0` | `#9273FF` | links, focus ring, active tab, selection |
| `accent-soft` | `#F0ECFF` | `#1C1638` | candidate rows, search highlight |
| `success` | `#0B7A5B` on `#E5F5EF` | `#4FD1A5` on `#0D2A22` | Completed, Passed, low risk |
| `warning` | `#96590A` on `#FDF1DC` | `#F0B45A` on `#2E2110` | Warning, review required, medium risk |
| `danger` | `#B3261E` on `#FCE9E7` | `#FF8F86` on `#33161A` | Failed, high risk |
| `info` | `#3B5BDB` on `#E9EEFF` | `#8FA6FF` on `#151D3D` | In progress |

All text/background pairs above meet WCAG AA (4.5:1) in both themes.

**Type.** Inter (self-hosted, variable) for everything; JetBrains Mono for room identifiers. `font-variant-numeric: tabular-nums` on every number and timestamp. Scale: 12/16, 13/18, 14/20 (body), 16/24, 20/28, 28/34. Weights 400, 500, 600. Uppercase 11 px eyebrow labels with 0.06em tracking, a cue from readie.io.

**Spacing** 4-point: 4, 8, 12, 16, 24, 32, 48. **Radii** 6 (chips, inputs), 8 (buttons, as on readie.io), 12 (cards), 16 (sheets). **Elevation** hairline borders by default; one soft shadow (`0 8px 24px rgb(16 16 32 / 0.12)`) reserved for overlays (sheets, popovers, toasts). **Motion** 150 ms for press and hover, 200 ms for tabs and cross-fades, 250 ms for sheets; `cubic-bezier(0.2, 0, 0, 1)`; all removed under `prefers-reduced-motion`.

**Buttons: the Polaris/Clerk bevel.** Buttons look like physical keys: lit from above, with a darker lower edge, and they sink when pressed. The recipe is adapted from the published Polaris `--p-shadow-button*` tokens and Clerk's top-sheen fill.

| Variant | Rest | Pressed |
|---|---|---|
| Primary (ink `#2A2A35`; near-white in dark) | fill plus sheen `linear-gradient(180deg, rgb(255 255 255 / .16), transparent 62%)`; shadow `inset 0 1px 0 rgb(255 255 255 / .22), inset 0 -1px 0 rgb(0 0 0 / .6), 0 0 0 1px #2A2A35, 0 1px 2px rgb(16 16 32 / .24)` | sheen off, `inset 0 2px 0 rgb(0 0 0 / .55)`, content shifts 1 px down |
| Accent (violet, at most one per view) | same recipe on `accent`, ring in a darker violet | same |
| Secondary (surface) | `inset 0 -1px 0 border-strong, inset 0 0 0 1px rgb(0 0 0 / .10), inset 0 .5px 0 1.5px #FFF` | `inset 0 2px 1px rgb(26 26 26 / .20), inset 1px 0 1px rgb(26 26 26 / .12), inset -1px 0 1px rgb(26 26 26 / .12)` on `surface-sunken` |
| Ghost | no bevel, text only | `surface-sunken` background |

Hover lifts the sheen slightly; focus adds a 2 px accent ring offset by 2 px. In dark mode the highlights drop to 8% white so the bevel reads as depth, not glare. Heights: 32 (dense desktop), 36 (default), 44 (touch).

## Component inventory

Button, IconButton, CopyButton, StatusPill (verification, verdict, risk), SegmentedControl, Select, SearchInput, FilterChip, Tabs with sliding indicator, Table, CandidateCard, Tooltip, Toast, BottomSheet, Skeleton, QueryState (loading / error / empty / success), ErrorPanel with collapsible technical detail, EmptyState, ConfidenceIndicator (radial and bar, `role="meter"`), RiskMeter, SegmentStrip, TranscriptEntry, EvidenceItem, Breadcrumb, ThemeToggle, ShortcutsSheet, DataSourceToggle and ScenarioSwitcher (mock mode only).

## Screens

**Campaign overview, desktop (1280).** Top bar: Readie mark, "Integrity audit", data-source menu, shortcuts, theme toggle. Page header: campaign title with the campaign segmented control (119 / 120 / 122 / 123) beside it, job title and candidate count, then a summary strip of three count tiles (Completed, In progress, Failed) that double as filters. Toolbar: email search (`/`), sort button. Table with sticky header: Candidate, Email, Room identifier (mono, middle-truncated, copy), Submitted (relative, absolute in tooltip, sortable with `aria-sort`), Verification (pill plus analysis percentage). Rows are links; `j`/`k`/`Enter` navigate.

**Campaign overview, mobile (390).** Compact top bar with a campaign select. Sticky full-width search with a Filters button that opens a bottom sheet (large status chips, sort options). Card list: name and status pill on the first line, email and relative time on the second, truncated room identifier on the third. Each card is one full-width link with press feedback.

**Room evaluation, desktop.** Breadcrumb "Campaign 119 / candidate". Header: candidate name (or email when the name is unknown), email, room identifier with copy, submitted time, verification pill, overall verdict tag, Share button. Segment strip: one numbered key per recording segment, tinted by state (analysed, processing, not analysed, failed) with a legend when states differ; pressing one scopes all three tabs to that segment. Sticky tabs: Transcript, Identity, Integrity (`1`/`2`/`3`). Content column max 760 px for transcript; two-column grid for the two analysis tabs (indicator left, evidence right).

**Room evaluation, mobile.** Header stacks; verdict tag stays on the first screen. Tabs become a sticky full-width segmented control under the header. Identity indicator switches from radial to threshold bar. Evidence and observation lists are single column.

**Tabs.** *Transcript*: single-column timeline grouped by segment; each entry has a speaker glyph, speaker label and `mm:ss`; interviewer entries on `surface-sunken`, candidate entries on `accent-soft` with an accent rule; in-transcript search. *Identity*: decision and confidence indicator with threshold marker, video-quality pair, multiple-people flag, matching and conflicting evidence, limitations. *Integrity*: verdict tag largest on the page, four risk checks as meters, flagged items grouped by category with timestamps, limitations; a positive empty state when nothing is flagged.

## Borrowed patterns

1. **Bevelled key buttons** with inset highlight, lower edge and sink-on-press: Shopify Polaris button shadow tokens, and Clerk's sign-in components.
2. **Violet accent on navy-black, uppercase eyebrow labels, 8 px radii**: readie.io.
3. **Count chips that are also filters** above a list: Linear's view filters and Stripe's payments status tabs.
4. **Dense table with hairlines, no zebra, sticky header, row as link**: Vercel deployments list and Stripe dashboard tables.
5. **Status as dot or icon plus word in a soft-tinted pill**: Stripe's status badges.
6. **Keyboard-first navigation (`/`, `j`/`k`, `?` sheet)**: Linear.
7. **Skeletons shaped like final content, previous data dimmed while refetching**: Vercel and Linear.
8. **Bottom sheet for filters, segmented control for peer views, 44 pt targets, safe-area padding**: Apple Human Interface Guidelines.
