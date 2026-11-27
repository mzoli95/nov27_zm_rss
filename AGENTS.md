# Repository instructions

## Scope and workflow

- Read PLAN.md before implementation. Follow the user's latest decisions and keep optional work separate from the committed demo scope.
- Follow [MILESTONES.md](MILESTONES.md). At each checkpoint, run the relevant checks, record observed results, make a meaningful commit and push the working branch when authorized. Share the commit link and identify what needs human review.
- Before implementation, define the demo scope, deliverables, milestone order, and rationale in PLAN.md. Specify which article fields and sources are eligible for matching and how case and phrases are handled.
- Practice lazy coding. Choose the simplest correct solution through the normal app entry points. Prefer one Angular app and one ASP.NET Core process. Introduce abstractions when an actual variation needs them, such as RSS ingestion and notification providers.
- Keep code, the UI, notification templates and repository documentation in English. User discussions may be in Hungarian.
- Keep frontend/ and backend/ at the repository root. Use one Git repository and meaningful commits for major milestones. Preserve unrelated changes. Never commit credentials, personal test data, local database files or build output.

## Code design

- Apply SOLID pragmatically. Give classes focused responsibilities, keep interfaces small, and isolate external services behind focused adapters. Reuse existing code and avoid speculative shared libraries, base classes and wrappers.
- Handwritten methods accept at most four parameters, excluding a CancellationToken. Group related inputs into a typed request or options object when they belong together.
- Aim for 150 lines or fewer per handwritten class, with a 200-line maximum. Split by responsibility. Apply these limits to handwritten code.
- Prefer focused feature folders, explicit names, small diffs and consistent formatting. Keep dependencies pinned and introduce packages only when they simplify a real requirement.
- Use explicit C# local types in preference to var. Use explicit TypeScript types for named fields, values, parameters and method return values, including void. Preserve contextual typing where an API supplies the callback type.
- Design for bounded work. Page list queries, fetch each external source once per cycle, limit network waits and batches, and keep one app instance for the SQLite-based demo.

## Angular

- Start with the latest stable Angular 22 release and a compatible stable NgRx and Node.js version. Confirm exact versions during scaffolding and commit the lockfile.
- Use standalone components, lazy-loaded feature routes and cursor-based feed pagination. Keep admin code behind its own route. Use accessible forms, loading and error states, and a keyboard-accessible way to load more feed items.
- Use Tailwind CSS for styling. Design mobile-first responsive screens with clear navigation, readable forms, keyboard focus and touch-friendly controls. Verify user and admin flows on narrow and wide viewports.
- Reuse the Tailwind theme tokens in frontend/src/styles.css. Use ink (#11243b), muted (#4b6179), primary (#1759b0), primary-hover (#12468b), page (#f4f8fe), line (#d7e3f2), and tint (#e4efff).
- Start each new implementation branch from the latest remote main and send it for review.
- Use NgRx for shared feature state. Place actions, effects, reducers and selectors in the feature's `+state/` folder. Keep transient form and component state local. Effects coordinate I/O, reducers stay pure, and selectors derive view data.
- Use Signal Forms and modern Angular template control flow. Bind derived state through selector signals or computed signals. Compare typed enum values for finite UI states. Use the local Bootstrap Icons font in templates and run ESLint and Prettier checks.
- Prefer the async pipe or signals for view bindings. Use `takeUntilDestroyed` for imperative subscriptions. Stop SignalR on logout, remove handlers when the owner is disposed, and avoid multiple connections per session.

## ASP.NET Core and SQLite

- Start with the latest stable .NET 11 SDK and compatible EF Core SQLite provider. Pin versions after checking the toolchain. Use ASP.NET Core built-in authorization, hosted services and typed HTTP clients.
- Keep SQLite normalized. Use separate relations for users, topics, sources, mappings, rules, channel preferences and deliveries. Use migrations, foreign keys, explicit uniqueness constraints and indexes for real query paths.
- Return early when required data is absent. Reuse the result of an existing lookup or query before considering an additional database round trip.
- Choose dependency injection lifetimes based on how each service is used:
  - Scoped: Use for `DbContext` and services that share it within a request or background unit of work.
  - Transient: Use for lightweight, stateless services that can be created each time they are resolved.
  - Singleton: Use for services that need one instance for the application lifetime. Make them thread-safe. Resolve scoped dependencies only within an explicit scope.
- Hosted services are singletons. Use `IServiceScopeFactory` to create and dispose a scope per background unit of work. Resolve scoped dependencies from that scope and keep EF Core contexts short-lived.
- Register typed HTTP clients with `AddHttpClient<TClient>()`. Avoid capturing a typed client in a singleton.
- Prevent overlapping runs of the same source, including scheduled and manual runs.
- Propagate request cancellation in HTTP handlers and host shutdown cancellation in background jobs. Pass the token to cancellable EF Core and HTTP calls.
- Put email and Slack behind one notification sender interface with a separate adapter for each provider.
- Persist events and notification work before external delivery. Use database uniqueness to prevent duplicate records. Check account, rule and channel eligibility before sending. Record failed or ambiguous delivery outcomes explicitly.
- Persist the delivery attempt as `Sending` before calling the provider. On startup, mark any unresolved `Sending` attempts as `Ambiguous` and show them in the admin view. Do not automatically resend deliveries with an unknown provider outcome.
- Validate JWTs and enforce ownership and admin policies on the server. Keep Supabase privileged credentials and channel secrets server-side. Restrict configured source URLs to approved external HTTPS destinations, including redirects. Treat feed content as untrusted.

## Logging

- Use `ILogger<T>` with structured message templates and named properties.
- Log RSS run summaries and delivery outcomes with the relevant source, run or delivery ID. Include the channel, status and elapsed time where applicable.
- Use `Information` for routine outcomes, `Warning` for recoverable failures or ambiguous deliveries, and `Error` for unexpected failures. Log each exception once at the point where it is handled.
- Keep credentials, tokens, webhook URLs, recipient addresses and raw payloads out of logs.
- Persist source run and delivery statuses in SQLite for the admin view. Use application logs for diagnostics.
- Log to the console by default. If local file logging is enabled, write rolling logs to the repository-root `logs/` directory, limit retention, and add `/logs/` to `.gitignore`.

## API and verification

- Use typed Angular HttpClient services and keep authentication in an interceptor. Attach the access token only to requests targeting the configured .NET API origin and path. Keep request and response types aligned with the backend contracts.
- Run relevant builds and focused checks before closing a milestone. Test deterministic inputs for core behavior and run a real integration smoke test where credentials and endpoints are available.
- Record what was checked, expected and observed, along with defects, rejected AI suggestions, fixes and retest results. Only mark completed checks as passed when evidence exists.

## Demo acceptance criteria

- Use a demo account with email and Slack enabled and a configured Slack destination. An article from one approved RSS source matches a saved rule and creates an in-app notification plus email and Slack delivery records. Email remains the default external channel for new accounts.
- The admin view shows the source run and the outcome for each channel.
- Reprocessing the same article creates no duplicate notification or delivery records.
- A failure in one channel leaves the other channel's outcome intact.
- Verify matching, deduplication and delivery record creation with a fixed RSS fixture. Record actual receipt in the test inbox and Slack channel separately.

## AI collaboration and evidence

- Keep all prompts in order, including follow-ups and corrections. Redact secrets and personal data.
- At each milestone, record the user's decisions and corrections, why they were made, and which AI suggestions were accepted or rejected. Link the relevant commits and include any checks actually run and their results.
