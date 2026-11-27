# Demo verification

Verified on 2026-11-27 from a fresh clone of `70055a9`. The verification runnable uses an isolated in-memory SQLite database, a fixed RSS fixture, a stub Supabase directory and recording senders. It calls the production importer and delivery batch.

## Observed results

| Check | Observed |
| --- | --- |
| Clean checkout backend Release build | Passed, zero errors and warnings |
| Clean checkout frontend install and production build | Passed |
| Fresh backend startup | Six SQLite migrations applied |
| Live RSS initial import | BBC Business 50, Technology 17, World News 29 |
| Silent first import | Zero alerts in the clean checkout and in the isolated fixture |
| Matching and replay | One new unread alert for the matching account, zero for the nonmatching account, no duplicate on replay |
| Delivery batch | One message per selected channel for the matching account, containing the expected link, no repeat on a second batch run |
| Admin route without a session | HTTP 401 |
| Receipt in a real email inbox and Slack DM for the same RSS match | Pending. The isolated test records dispatch through substitute senders. |

## Reproduce

Use .NET 11 and a Node version supported by the project's Angular CLI. Run `dotnet run --project verification/demo/Demo.csproj` from the root. The runnable prints nine PASS lines, exits with an error on the first failed check, and uses no real credentials.

For the live demo, follow the [local setup guide](local-setup.md). Use a dedicated verified account whose email matches an active member of the Slack bot's workspace. Save both providers, enable Slack in that account's profile, and confirm it can receive both admin test messages. Import a source once to establish the baseline. Save matching alert preferences, then import after that source publishes a new item. Compare the in-app alert to the actual email and DM after the digest window closes. Repeat the import and confirm the alert and delivery records are not duplicated. Capture only redacted screenshots and record provider acceptance separately from receipt.
