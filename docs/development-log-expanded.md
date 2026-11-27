# Development log expanded

This English companion to the original development log focuses on ownership, review and corrections. The prompt-excerpts file preserves selected original wording. Observed results are identified separately from plans and hypotheses.

| Decision | User ownership | AI contribution |
| --- | --- | --- |
| Define important events | Set a news-first MVP, fixed topics, custom labels, and extensible source-to-topic assignments. Kept price thresholds optional. | Proposed shared polling, local matching and a replayable baseline to prevent old alerts. |
| Choose architecture | Chose Angular, .NET, SQLite and Supabase, an English UI and a simple implementation. Proposed in-app notifications and SignalR. | Drafted the plan and diagrams, proposed persisting notifications before live updates, and organized the work into reviewable milestones. |
| Manage delivery | Chose default email, optional Slack, global enable and disable, and a shared template. Brought external AI feedback about separate adapters and removed Swagger and NSwag from scope. | Applied a shared sender interface, provider configuration and administrative test sends. |
| Review workflow | Set fresh-base branches, PR review checkpoints, explicit types, Signal Forms and NgRx conventions. Reviewed and merged earlier changes, and identified follow-up issues from screenshots and code. | Applied the requested conventions, reported builds and integration limits, and maintained the log. |
| Defer unknown providers | Asked to stage Teams, Discord and Telegram and document that their configuration is provider-specific. | Added known-provider identifiers and settings. The planned private destinations and delivery adapters remain open. |

## Evidence-driven course corrections

### A zero-import result was insufficient

The AI initially treated a successful run with a zero insert count as adequate evidence. The user rejected that conclusion after seeing newer content in the BBC feed. A direct comparison showed that the same canonical URL had a newer RSS timestamp while SQLite retained the older timestamp. The importer was changed to update the known article. The retest showed the same article ID moving from 10:26 to 14:49 UTC without a duplicate. The insert counter still reported zero for that update, which clarified the difference between a new record and a refreshed record.

### Slack success required several independent checks

The user supplied browser screenshots and retried after each change. A request failing at localhost was distinguished from a Slack provider rejection. Further tests identified missing consent on the installed token, an unmatched workspace member email, and then a posting rejection. The AI exposed the method and Slack error code. The final provider code was messages_tab_disabled. The user enabled the relevant Slack setting and showed the bot's unread badge. Opening the actual message and live delivery of the same RSS alert to two channels were not independently recorded.

### Matching changed after user review

The first personalized feed required topic eligibility and at least one label when labels existed. The user expected a selected topic to trigger an alert independently of labels. The revised feed and alert insertion use any selected topic or any matched label. The clean-clone demo fixture includes a matching topic alongside an unrelated label and checks that there is one alert.

### Builds and runtime evidence are distinct

After the user reported that two admin views did not show locally, builds exposed a C# anonymous-object property mismatch. The AI fixed the mismatched property name and restarted the local API. The frontend and backend then built and the admin route and protected API were reachable. This checked compilation and startup. Signed-in configuration saves and provider receipt require separate verification.

## Review links

- Feature baseline and source for the submission review: [70055a9](https://github.com/mzoli95/nov27_zm_rss/commit/70055a96ae4f1fab2281b161c514eaa81635257f).
- Templates, scheduling and fixes: [604f84e](https://github.com/mzoli95/nov27_zm_rss/commit/604f84e64d425b9e26afd2f1f5d19c117bfc7d06).
- Reproducible alert-path verification: [d951bcc](https://github.com/mzoli95/nov27_zm_rss/commit/d951bcccf6c3c0328e75832c970e2f34af7fcedf).
- Remaining scope and review status: [fe322e7](https://github.com/mzoli95/nov27_zm_rss/commit/fe322e76a3999e27d01f9730206bc4486f3117db).

Private screenshots, test credentials, API keys and personal identifiers are excluded. The original conversation export remains a separate submission task.
