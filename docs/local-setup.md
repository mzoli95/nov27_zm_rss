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

Set `Supabase.Url` to your Supabase project URL and `Supabase.PublishableKey` to the `sb_publishable_...` key. For admin access, follow the [Supabase roles instructions](../README.md#supabase-roles-and-review-accounts).

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

The user directory and both alert adapters need the backend-only `Supabase.SecretKey` to read the current verified account email. Find the `sb_secret_...` key under **Settings → API Keys → Publishable and secret API keys** in the Supabase dashboard. Put it under `Supabase.SecretKey` in `backend/appsettings.Local.json`, then restart the backend. [Supabase API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

| Section | Purpose | Values to prepare |
| --- | --- | --- |
| `Notifications.Email` | Application alert emails | In **Administration → Delivery channels → Email → Configure**, enter `smtp-relay.brevo.com`, port `587`, STARTTLS, the Brevo SMTP login and generated SMTP key, and a verified sender address. Brevo's free plan includes up to 300 sends per day. [Brevo SMTP setup](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP) · [Free plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) |
| `Notifications.Slack` | Personal Slack alerts | Install a Slack app with the bot scopes `users:read.email`, `im:write` and `chat:write`. In **Administration → Delivery channels → Slack → Configure**, enter its bot token. The member's Slack email must match the verified app email. [Slack email lookup](https://docs.slack.dev/reference/methods/users.lookupByEmail/) |
| `News` | Scheduled ingestion | Hangfire runs enabled sources sequentially on startup and every 30 minutes by default. Individual sources can be paused in Admin. Set `News.Enabled` to false to stop automatic imports. The archive runs daily at 02:15 UTC and at startup. |

Backend JSON remains a fallback for SMTP and Slack. The admin form stores encrypted provider settings in SQLite. Keep the local `.keys` folder with the database so those settings can still be decrypted. Hangfire's job history is in memory and recurring jobs are registered on startup. Supabase authentication email and application alert email have separate settings.
