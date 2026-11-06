# API findings (probed 2026-11-05)

Base URL `https://readie001.uc.r.appspot.com/auth/recording/jobs`. Raw responses are in `docs/api-samples/` (not committed: they contain real candidates' names, emails and recording URLs).

## `GET /campaignHACKATHON/{campaignId}`

Returns a bare JSON array of jobs. No envelope, no pagination.

| Campaign | Jobs |
|---|---|
| 119 | 4 |
| 120 | 0 (`[]`) |
| 122 | 0 (`[]`) |
| 123 | 6 |

| Field | Type | Notes |
|---|---|---|
| `roomName` | string | `campaign_<id>interview~~<email>~~<hash>`; the hash segment can be missing and the email can contain a space (`campaign_119interview~~fpqwz0gqfv 12@lnovic.com`) |
| `campaignId`, `userId` | number | |
| `candidateUserId` | number or null | |
| `candidateId` | string or null | |
| `candidateName` | string or null | null in 6 of 10 jobs |
| `candidateEmail` | string | |
| `candidateDateCreated` | string | ISO 8601 with offset, `2026-10-27T09:17:20.822+00:00`; used as the submission timestamp |
| `campaignJobTitle` | string | |
| `analyticsCompleted` | boolean | |
| `percentageAnalyticCompleted` | number | 0 to 100, fractional |
| `campaign_assessment_video_link` | array | 0 or 1 items; snake and camel case mixed; `pctCorrect` arrives as `1E+1`; `activityCountsByType` is a JSON string |

There is no verification-status field. The spec's `COMPLETED | IN_PROGRESS | FAILED` has to be derived.

## `GET /roomsHACKATHON/{roomName}`

Returns a bare JSON array of **recording segments** (1 to 16 per room, roughly one every four minutes), not a single evaluation. Order is not chronological.

Per segment: `roomName`, `recordingType` (`COMPOSITE`), `databaseType`, `campaignId`, `userId`, `status` (`PERSISTED` 64, `FAILED` 1), `attempts`, `lastError` (always null), `egressId`, `objectPath`, `finalUrl`, `participantIdentity` (always null), `campaignRecordId` (null on the one `FAILED` segment, along with `finalUrl` and `persistedAt`), `parsedCampaignId` (string), `extractedEmail` (unreliable: usually contains the hash), `campaignAssessments` (array), `createdAt` / `updatedAt` / `persistedAt` / `nextCheckAt` (ISO **without** offset; they match the campaign's UTC values, so they are UTC), `analyticsCompleted` (`"Y"` 12, `"N"` 52, `"P"` 1; a string here, a boolean on the campaign endpoint), and `analytic` (object or null; null on 53 of 65 segments).

The room response carries no candidate name or email.

`analytic`:

- `identity_phase1`: object or null (present on 1 of 12 analysed segments). `decision` (`CONSISTENT`), `confidence` (0 to 1), `referenceVideoQuality`, `interviewVideoQuality` (`FAIR`), `multiplePeopleDetected` (boolean), `matchingEvidence[]`, `conflictingEvidence[]` (items: `timestamp` `mm:ss`, `source`, `category`, `observation`), `limitations[]` (strings).
- `deepfake_phase2` (the spec calls this `integrity_phase2`): `gemini.overallRisk` (`LOW`); four checks `syntheticVideo`, `personContinuity`, `audioVideoConsistency`, `possibleOffScreenAssistance`, each `{ risk, confidence, observations[] }`; `suspiciousTimeRanges[]` (always empty); `limitations[]`; `transcript.entries[]` (`timestamp` `mm:ss` relative to the segment, `speaker` `INTERVIEWER | INTERVIEWEE | PARTICIPANT`, `text`, `videoUrl`); `specialistResults[]` (always empty); `disposition`; `humanReviewRequired`.
- `candidateId`, `disposition` (`PASS_WITH_LOW_RISK | REVIEW_REQUIRED`), `humanReviewRequired`.

Not present anywhere: liveness result, gaze tracking index, audio anomaly count, flagged frames, a `PASSED | WARNING | FAILED` tag.

## Encoding

| Form sent | Result |
|---|---|
| raw `@` and `~~` | 200 |
| `encodeURIComponent` (`%40`) | 200, same body |
| fully escaped (`%7E%7E`, `%40`) | 200, same body |
| double-encoded (`%2540`) | 400 |
| space as `%20` | 200 |
| space as `+` | 200 `[]` (treated as a literal plus) |
| `/` as `%2F` | 400 HTML page from the servlet container |

Encoding exactly once with `encodeURIComponent` is correct. A room name containing `/` cannot be fetched from this server in any form.

## Errors

| Case | Response |
|---|---|
| Unknown campaign | 200 `[]` (indistinguishable from an empty campaign) |
| Unknown room | 200 `[]` |
| Non-numeric campaign id | 401 with a Java conversion message in `error` |
| No auth headers, wrong Basic, or missing Basic | 401 `{ timestamp, status, error: "Unauthorized", path }` |
| Missing `MyAuthorizationx` (Basic present) | 500 `{ error: "Unable to retrieve campaign recording rooms" }` |

## CORS

Preflight from `http://localhost:5173` returns 403 with no `Access-Control-*` headers. Only `https://readie.io` and `https://www.readie.io` pass. A plain GET that carries a disallowed `Origin` header is also rejected with 403. The browser cannot call the API directly from localhost or from a deployed demo, so requests go through a same-origin proxy (Vite dev proxy, Vercel rewrite) that forwards the client's headers and drops `Origin`.

First request after idle took 4.4 s (cold start); warm requests take about 0.9 s.
