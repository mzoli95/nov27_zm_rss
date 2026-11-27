# Account archive and delivery verification

## Live notification receipt

On 2026-11-27 the project owner reported receiving alerts in the app, by email and in Slack during normal use. The local database showed 11 email attempts accepted by the provider, five Slack attempts accepted, and six Slack attempts failed. The database provides provider outcomes. The owner's report provides evidence of receipt. An individual RSS article was not correlated across all three destinations for this check.

## Account archive

The profile offers a confirmation step, followed by sign-out. The deployment stores the archive flag in its SQLite database and denies subsequent protected requests for that account. Preferences, likes, prior inbox entries and the Supabase account are retained. Pending delivery attempts are skipped. A send already in progress may complete. Archive state applies to the SQLite database for this deployment.

| Check | Observed |
| --- | --- |
| Angular production build | Passed |
| .NET Release build | Passed |
| Repeat archival and account isolation | Passed. Archiving the fixture account twice left the other account active. |
| Retention | Passed. Existing preferences and inbox entry were retained. |
| Existing delivery work | Passed. The two pending attempts were marked Skipped. |
| Worker eligibility | Passed. A simulated leftover pending attempt for the archived account did not send on either channel. |
| New matching RSS article | Passed. The article imported without creating an alert or delivery attempt for the archived account. |
| Local migration and anonymous request | Passed. The migration was applied and an anonymous archive request returned HTTP 401. |
| Signed-in browser confirmation and subsequent login rejection | Pending manual verification with a disposable account. |

The backend verification extended the isolated demo fixture with an in-memory SQLite database and recording senders. No live account was archived and no real notification was sent by the fixture.
