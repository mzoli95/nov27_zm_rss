# Local setup on Windows

Use Command Prompt (CMD). Run the two processes in separate CMD windows. The application files must be present in your checkout. Until the shell pull request is merged, use the `feat/application-shell` branch.

## Supabase

The backend reads `backend/appsettings.Local.json` in Development mode. If this file already exists, keep it and update the relevant fields. Otherwise, create it from the setup branch's example without switching away from the application branch.

```bat
cd /d E:\nov27
git fetch origin docs/local-integration-config
git show FETCH_HEAD:docs/appsettings.integrations.example.json > backend\appsettings.Local.json
notepad backend\appsettings.Local.json
```

Set `Supabase.Url` to your Supabase project URL and `Supabase.PublishableKey` to the `sb_publishable_...` key. Keep `AdminUserIds` empty for a normal account. To grant demo admin access, add the verified user's Supabase UUID to that array and restart the backend.

In your Supabase project, enable email/password registration and email confirmation. Set the Auth Site URL to `http://localhost:4200` and allow these redirect URLs.

- `http://localhost:4200/`
- `http://localhost:4200/update-password`

The application branch ignores `backend/appsettings.Local.json`. Use a publishable key in that file because the application exposes this key to Angular through its public config endpoint.

## Start the backend

```bat
cd /d E:\nov27\backend
set "ASPNETCORE_ENVIRONMENT=Development"
dotnet run --urls http://localhost:5090
```

The workspace also contains a local .NET 11 SDK if the system `dotnet` only lists .NET 10. From the same backend directory, run `..\.dotnet\dotnet.exe run --urls http://localhost:5090`.

## Start the frontend

```bat
cd /d E:\nov27\frontend
npm ci
npm start -- --proxy-config proxy.conf.json
```

Open `http://localhost:4200`. Angular 22.3 needs a compatible Node version. If the system Node is still 24.13, use these commands instead of the two npm commands above.

```bat
npx --yes --package=node@24.15.0 -- npm ci
npx --yes --package=node@24.15.0 -- node node_modules\@angular\cli\bin\ng.js serve --proxy-config proxy.conf.json
```

## Email, Slack and RSS

Supabase sends signup confirmation and password-reset emails. Configure its custom SMTP in the Supabase dashboard when sending to users outside the project team. [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

The JSON example also reserves configuration for upcoming application integrations. The current shell uses the Supabase section. It reads demo articles from SQLite.

| Section | Purpose | Values to prepare |
| --- | --- | --- |
| `Notifications.Email` | Application alert emails | SMTP host, provider port and TLS mode, credentials, and verified sender address. |
| `Notifications.Slack` | Application alerts to a Slack destination | Incoming webhook URL for the intended channel. [Slack incoming webhooks](https://api.slack.com/messaging/webhooks) |
| `Rss` | Scheduled ingestion | A 30-minute default interval and URLs for BBC World, BBC Business and Cointelegraph. These RSS endpoints have no API key. Validate feed content and permitted use before enabling. |

Keep SMTP credentials and the Slack webhook in local configuration. The delivery and RSS milestones will wire these sections into the backend.
