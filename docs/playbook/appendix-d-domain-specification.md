# Appendix D — Domain Specification Template

**Companion:** [Production PWA Generation Playbook](../PWA_Generation_Playbook.md)  
**Purpose:** Make a product's domain semantics, API interfaces, time rules and failure behavior precise enough for independent re-implementation. A generic PWA architecture does not imply a correct domain algorithm.

Copy and complete this as **docs/domain-spec.md** in each new project. Mark a missing product decision **TBD**, do not silently infer a threshold or business rule, and ask for decisions that could change the correctness of the answer.

## D.1 Project intake and boundary

| Contract | Concrete value required |
| --- | --- |
| User decision | [What the user decides after seeing the result] |
| Primary command | [Name, inputs, permissions, trigger] |
| Data provider | [Endpoint, official docs, credentials/quotas, licence] |
| Locales / units | [Locale, display units, canonical calculation units] |
| Domain state taxonomy | [All mutually exclusive states, unknown, unavailable] |
| Transition concept | [What proves a transition and what time is displayed] |
| Forecast horizon / currency | [Maximum lookahead, expiration, acceptable age] |
| Privacy | [Location precision, retention, user deletion, consent] |
| Offline contract | [What is allowed, storage format, staleness policy] |
| Scope exclusions | [What must not be inferred, stored, displayed or built] |

## D.2 Explicit state machine and UI projection

Separate three axes. **DomainState** is not **NetworkState**, and neither is **FetchState**.

~~~ts
type DomainState =
  | { kind: 'active'; measuredAt: string }
  | { kind: 'inactive'; measuredAt: string }
  | { kind: 'unknown'; reason: string };

type NextTransition =
  | { kind: 'starts' | 'stops'; at: string; zone: string }
  | { kind: 'not-expected'; through: string; zone: string }
  | { kind: 'unknown'; reason: string };

type DataProvenance =
  | { kind: 'live'; fetchedAt: number; provider: string }
  | { kind: 'cached'; fetchedAt: number; provider: string };

type FetchState = 'idle' | 'loading' | 'success' | 'error';
type NetworkState = 'online' | 'offline' | 'origin-unreachable';
~~~

**Projection decision table** — replace these example labels with the actual product language:

| Validated current | Validated next | UI heading | Style | Supporting detail |
| --- | --- | --- | --- | --- |
| active | stops at T | ACTIVE → STOPS AT T | active→inactive | Approximate; fetched timestamp |
| inactive | starts at T | IDLE → STARTS AT T | inactive→active | Approximate; fetched timestamp |
| inactive | not-expected through H | IDLE → NO CHANGE EXPECTED | inactive-only | Include horizon if necessary |
| active | unknown | ACTIVE → TIME UNKNOWN | active-only | Do not invent change |
| unknown | any | UNKNOWN | neutral | Explain failure once |
| any | cached | same saved state | same tone, historical label | **CACHED** + original fetched time |
| none | offline | NO SAVED RESULT | neutral | No loader or API call |

Other transitions require an explicit product decision. Do not display a gradient for an unknown transition. Color cannot be the only means of conveying the state.

## D.3 Provider contract — fill every field

~~~yaml
provider:
  name: "TBD"
  documentation: "TBD"
  base_url: "TBD"
  method: GET
  endpoint: "TBD"
  authentication: "none | server-proxy | API key (never in client source)"
  request:
    query:
      latitude: "number / required only for location apps"
      longitude: "number / required only for location apps"
    headers: {}
    timeout_ms: 10000
    abort_on_new_selection: true
  response:
    current_state_json_path: "TBD"
    observation_time_json_path: "TBD"
    hourly_values_json_path: "TBD"
    hourly_times_json_path: "TBD"
    units: "TBD"
    timezone: "TBD"
    nullable_fields: ["TBD"]
  constraints:
    quota: "TBD"
    attribution: "TBD"
    rate_limit: "TBD"
  failures:
    401: "configuration/auth error"
    429: "rate-limited; honor Retry-After where provided"
    500: "transient provider error"
    network: "offline/unreachable"
    malformed_response: "unknown, never fabricate a result"
~~~

**API reliability rules:** distinguish missing properties from zero; guard all arrays and numeric values; align timestamps to values; check timezone semantics; enforce a response-size and freshness policy; cancel obsolete requests and ignore responses from an earlier selection. Provider error strings must not leak sensitive credentials into the UI.

## D.4 Deterministic algorithms — specify like a pure function

Each domain interpretation rule must identify inputs, units, thresholds, output shape, uncertainty, and boundary conditions. Avoid using provider prose as the canonical data model.

**Example of a fully specified weather-domain algorithm (NOT a required default for other PWAs):**

- Current rainfall status: current rain or showers greater than zero → raining; exactly zero and both valid → dry; missing/invalid → unknown.
- Forecast search begins **after** the timestamp's current hour; do not mark the current hour as a newly starting event.
- For rain onset, sum valid hourly rain + showers; a future hour at **at least 0.1 mm/h** is the first expected event. This threshold is a **domain-specific choice**, not a generic app constant.
- Rain cessation: detect the first **two consecutive** future hours below **0.1 mm/h**; otherwise say no clear stop time within the available horizon. Decide how the system treats missing readings (do not count missing as dry).
- If no qualifying future rain exists inside a valid forecast horizon, say **No rain forecast within the available period**, not “never rains.”
- Presentation time is approximate and must carry the location's date/timezone; persist absolute forecast timestamps instead of "tomorrow" text.
- If hourly data are unavailable, show **TIME UNKNOWN** rather than asserting “no rain expected.”

**Generic pure-function interface:**

~~~ts
type DomainInput = { current: unknown; series: unknown; providerTimeZone: string };
type DomainResult = {
  state: DomainState;
  transition: NextTransition;
  observedAt: string | null;
  source: string;
  reasonCodes: string[];
};
declare function interpretDomain(data: DomainInput): DomainResult;
~~~

### D.4.1 Boundary examples an agent must be able to evaluate

| Given | Expected outcome |
| --- | --- |
| All current numeric values are zero | Negative/inactive, not missing |
| One required current value is missing | Unknown unless the product explicitly permits partial values |
| Forecast series empty | Unknown transition, not “none expected” |
| Future event at precisely threshold | Include or exclude according to documented inclusive rule |
| Two dry hours separated by missing hour | Not a consecutive valid dry pair |
| Last forecast hour contains first qualifying event | Valid onset if the time/value pair is valid |
| Forecast time spans midnight / DST | Use provider/location timezone, not device date assumptions |
| User selects B before A's request finishes | A's response cannot replace B |
| Device goes offline during loading | Abort/ignore result; offer historical snapshot if present |

## D.5 Storage schema and data lifetime

Provide a real schema, not a collection of formatted strings:

~~~json
{
  "schema": 1,
  "lastSelection": { "id": "stable-id", "label": "Sample" },
  "snapshots": {
    "stable-id": {
      "fetchedAt": 1792170000000,
      "observedAt": "2026-10-16T14:30:00+03:00",
      "state": "inactive",
      "nextTransition": {
        "kind": "starts",
        "at": "2026-10-16T19:00:00+03:00",
        "zone": "Europe/Sofia"
      },
      "source": "provider-name"
    }
  },
  "history": [
    {
      "key": "stable-id",
      "checkedAt": 1792170000000,
      "snapshot": {}
    }
  ]
}
~~~

The timestamps are *illustrative*; this is **not RainCheck's existing storage schema**. Specify migration behavior, max item count, max age, how to compare stable IDs, whether snapshots stay when history items are deleted, and what should happen if storage is denied or corrupt. Never store credentials in a client snapshot.

**Separate time semantics:** \`fetchedAt\` = last successful retrieval; \`observedAt\` = provider data timestamp; \`transition.at\` = predicted event; \`checkedAt\` = explicit user invocation. Presentation of "today" or "tomorrow" should derive from absolute times in the right timezone, not be persisted as the sole source of truth.

## D.6 Concurrency and offline contracts

**Online:** check in-memory TTL cache first; deduplicate identical in-flight API requests; permit a user-triggered refresh; ensure one selected-entity token prevents stale updates; persist successful provider results as bounded snapshots; record history **only for explicit checks**.

**Offline:** never start a provider/GPS/geocoding request for a supported saved-data action; don't show a loader; read last known valid data and label it **CACHED** with its actual fetched time; expose an empty state when none exists. History clicks and deletions never send requests.

**Reconnect:** a service-worker update is separate from a data refresh. A new app shell must not silently turn stale domain data into "live" data. Do not reload while an unsaved form/editor has changes without preserving them or asking permission.

## D.7 Domain acceptance matrix

Each product must include at least these tests **as specifications**, whether or not test execution is authorized:

| ID | Setup / input | Action | Expected observable behavior |
| --- | --- | --- | --- |
| DOM-01 | First use / no data | Run check | Clear success/error and no invented value |
| DOM-02 | Valid positive state | Run check | Correct state and transition / accuracy qualifier |
| DOM-03 | Valid negative state | Run check | Negative distinct from missing |
| DOM-04 | Missing current field | Run check | Unknown |
| DOM-05 | No future transition within valid horizon | Run check | "Not expected within horizon" |
| DOM-06 | Missing forecast horizon | Run check | Time unknown |
| DOM-07 | Old successful response returns late | Select a new entity | Old result ignored |
| DOM-08 | Offline and cached | Run check | Immediate cached result, zero requests |
| DOM-09 | Offline and no saved result | Run check | Helpful empty state; no spinner |
| DOM-10 | Recent history exists | Open/remove entry | Local-only; predictable order |
| DOM-11 | New PWA build activated | Reopen app | New shell, intact storage |
| DOM-12 | DST/day boundary | Display saved forecast | Correct absolute date/timezone |

**Do not confuse** an acceptance *specification* with tests already executed. Follow the project's explicit testing permissions.

## D.8 Agent hand-off gate

Before generating implementation, the agent must be able to answer:

1. What exact valid data results in each domain state?
2. What thresholds, inclusivity and time windows are used?
3. When does “not expected” differ from “unknown”?
4. How do network failures affect the data's provenance?
5. What timestamps and timezone are retained?
6. Which exact actions are allowed offline?
7. Which changes mutate history vs. snapshots?
8. What are the API errors, quotas and legal requirements?
9. Which assumptions require product-owner decisions?
10. What remains unverified at delivery?

If material answers are TBD, do not pretend a production-quality domain algorithm has been specified.

**Related:** [Appendix C](appendix-c-reference-architecture.md) and [Appendix E](appendix-e-ux-design-system.md).
