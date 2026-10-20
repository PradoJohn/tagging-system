# REI Tag Generator: Dataverse sync setup

How tags get from the phone into Dataverse (and Power BI):

```
App on phone ──► local outbox (localStorage) ──► Power Automate flow ──► Dataverse table ──► Power BI
                       ▲                                │
                       └────── retry if it fails ───────┘
```

Sync is off until you paste the flow URL into `src/config.js`. With it empty,
the app behaves exactly as before.

---

## 1. Test the app locally (no Power Platform needed)

```bash
npm install
npm test               # 9 automated tests, incl. offline, retry, duplicates
```

To click through it yourself:

```bash
npm run mock-flow      # terminal 1: fake flow at http://localhost:7071/flow
npm run dev            # terminal 2: the app
```

Set `SYNC_URL = "http://localhost:7071/flow"` in `src/config.js`, generate a
few tags, and open http://localhost:7071/rows to see what was "saved".
To see the retry behavior, stop the mock flow, generate a tag (it shows
**Pending**), start the mock flow again, and tap **Sync now**.
`FAIL=1 npm run mock-flow` makes every upload fail.

---

## 2. Create the Dataverse table

Table name: **REI Tag** (plural **REI Tags**). Pick the environment carefully;
see the note on tenant migration at the end.

| Display name | Type | Required | Notes |
|---|---|---|---|
| Field Number | Single line of text | Yes | Make this the **primary name column** |
| Tag ID | Single line of text | Yes | The app's unique ID for each tag. Add an **alternate key** on it |
| REI Hours | Whole number | Yes | 4, 12, 24 or 48 |
| Start | Date and time | No | Recorded as finish − 3 min (estimated, not observed) |
| Finish | Date and time | Yes | |
| Re-Entry | Date and time | Yes | Finish + REI hours |
| Generated At | Date and time | No | When the tag was made on the phone |

Leave the date columns' behavior as **User local**. Dataverse stores them in UTC.

The logical names get your publisher prefix (e.g. `cr4a1_tagid`). Note the real
**Tag ID** logical name; the flow's filter needs it.

---

## 3. Build the flow

**Trigger: When an HTTP request is received**
- Who can trigger the flow: **Anyone**
- Method: **POST**
- Request Body JSON Schema:

```json
{
  "type": "object",
  "properties": {
    "tagId":       { "type": "string" },
    "fieldNumber": { "type": "string" },
    "reiHours":    { "type": "integer" },
    "start":       { "type": "string" },
    "finish":      { "type": "string" },
    "reentry":     { "type": "string" },
    "createdAt":   { "type": "string" }
  },
  "required": ["tagId", "fieldNumber", "reiHours", "finish", "reentry"]
}
```

**Action: List rows** (Microsoft Dataverse)
- Table name: REI Tags
- Filter rows: `cr4a1_tagid eq '@{triggerBody()?['tagId']}'` (use your prefix)
- Row count: `1`

**Condition**
- Left: expression `length(outputs('List_rows')?['body/value'])`
- Operator: is equal to
- Right: `0`
- **If yes → Add a new row** (Microsoft Dataverse), table REI Tags:
  - Field Number = `fieldNumber`
  - Tag ID = `tagId`
  - REI Hours = `reiHours`
  - Start = `start`
  - Finish = `finish`
  - Re-Entry = `reentry`
  - Generated At = `createdAt`
- **If no** → leave empty (tag already saved; this is what prevents duplicates
  when the app retries)

**Action: Response** (after the Condition)
- Status code: `200`
- Headers:
  - `Access-Control-Allow-Origin` : `*`
  - `Content-Type` : `application/json`
- Body: `{ "ok": true }`

Optional: add a second **Response** with status `500` and the same headers, set
to run only if the Condition **has failed** (Configure run after). Without it,
a failed save just looks like a network error to the app, which still retries.

Save the flow, then copy the **HTTP URL** from the trigger.

> The URL contains a signature (`sig=...`) and works like a password: anyone
> who has it can add rows. Keep the app internal. If IT requires sign-in per
> user, that needs an Entra app registration instead.

---

## 4. Test the real flow before connecting the app

Open the page where the app is hosted (so the browser applies the same
security rules the app will), open the browser console (F12), and run:

```js
fetch("PASTE_FLOW_URL_HERE", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tagId: "test-001",
    fieldNumber: "999",
    reiHours: 4,
    start: new Date(Date.now() - 180000).toISOString(),
    finish: new Date().toISOString(),
    reentry: new Date(Date.now() + 4 * 3600000).toISOString(),
    createdAt: new Date().toISOString(),
  }),
}).then((r) => console.log("Status:", r.status));
```

Expected:
1. `Status: 200` in the console, and one **999** row in the REI Tags table.
2. Run it again: still `200`, still only **one** row (duplicate check works).
3. Delete the test row afterwards.

If the console shows a **CORS** error instead of a status, check the Response
action has the `Access-Control-Allow-Origin` header and that the flow run
succeeded (flow run history).

---

## 5. Connect the app

Paste the URL into `src/config.js`:

```js
export const SYNC_URL = "https://...your flow URL...";
```

Generate one tag. History should show it as **Saved**, and the row should
appear in Dataverse. Any tags already in a phone's History upload the first
time it opens the new version.

---

## 6. Power BI

**Get data → Dataverse**, sign in, pick the environment and the REI Tags table.
Times arrive in UTC. Hawaii is UTC−10 with no daylight saving, so in Power Query
add a column such as:

```
= [Re-Entry] + #duration(0, -10, 0, 0)
```

(Same for Start, Finish and Generated At.) Set a scheduled refresh in the
Power BI service.

### Two kinds of rows

| | When it's sent | Field Number | Tag ID |
|---|---|---|---|
| **Record** | Automatically on **Generate Tag** | As typed: `012` | e.g. `mgx1k2-ab12cd` |
| **Report** | When the user taps **Report** in History | With prefix: `A-012` | Same ID + `-A`: `mgx1k2-ab12cd-A` |

- **Records** are the full background log: every tag generated, including
  mistakes the user later removed.
- **Reports** are only the tags the user reviewed and chose to report.
  For REI reporting, filter Field Number **begins with** `A-`.
- To compare the two, strip the prefix (Power Query: `Text.AfterDelimiter([Field Number], "A-")`),
  or match a report to its record by removing `-A` from the end of its Tag ID.

---

## Notes

- **Who made each tag** isn't recorded yet. Every row is created by the flow
  owner. Adding an Applicator field to the form is a small change if needed.
- **Remove / Clear All** in the app only affect that phone. Saved rows stay in
  Dataverse, and a removed tag's record is still sent if it hadn't gone out
  yet (e.g. no signal).
- **Flow ownership:** if the flow owner's account goes away, the flow stops.
  Consider a service account or a co-owner.
- **Tenant migration:** if the site is moving to a new tenant, confirm with IT
  which environment the table and flow should be created in first.
