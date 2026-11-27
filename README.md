# World Event Alerts

World Event Alerts is a web app in development for following world news and receiving personalized alerts. The current milestone includes authentication, a protected news feed, profile preferences, source administration and in-app alerts.

## Run the application shell

1. Install the .NET 11 SDK and Node.js 24.15 or newer in the Node 24 release line.
2. Copy `backend/appsettings.Local.example.json` to `backend/appsettings.Local.json`. Set your Supabase project URL and **publishable key**. Enable email/password registration and email confirmation. Allow `http://localhost:4200/` and `http://localhost:4200/update-password` as redirect URLs.
3. From `backend/`, set `ASPNETCORE_ENVIRONMENT=Development` and run `dotnet run --urls http://localhost:5090`. The API migrates SQLite on startup and seeds sample articles in Development.
4. From `frontend/`, run `npm ci` and `npm start -- --proxy-config proxy.conf.json`. Open `http://localhost:4200`.

Use the Supabase publishable key in this configuration. The API exposes it to Angular. The local configuration file, database and logs are excluded from Git.

The authentication forms require passwords of at least six characters. Keep the Supabase project's minimum password length aligned with this setting.

## Profile and news sources

- In **Profile**, choose from the fixed topic catalog and optionally add comma-separated labels. A story matches when it belongs to a selected topic and contains at least one label, if labels are set. Labels alone can match across topics. Use **View matching news** to preview the matches.
- In **Administration → News sources**, use **Add source** to open the editor. Enter an approved HTTPS RSS, Atom or USGS URL and select one or more topics. Optional comma-separated keywords restrict each assignment. **Test source** reads the live payload without saving or importing. You can edit or delete existing sources and use **Run now** to import immediately. Deleting a source preserves existing articles.
- BBC World, Business and Technology are seeded. Business supplies the default coverage for **Economy**, **Stock Market** and **Crypto**. For additional crypto coverage, assign `https://cointelegraph.com/rss` to **Crypto**. For earthquake reports, select **USGS earthquakes**, enter `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson` and select **Natural Disasters**.
- Each source's first successful import populates the feed silently. Later new matches appear under the notification bell. Articles are deduplicated by normalized URL and exact normalized headline on the same UTC publication date.
- Hangfire runs enabled sources sequentially on startup and every 30 minutes by default. Sources can be paused individually. SQLite retains normalized article identities so reruns can skip duplicates.
- The daily archive job removes summaries and image URLs from articles older than seven days, excludes them from the active feed, and compacts SQLite when rows were archived. Saved likes and existing inbox entries keep their titles and original links.
- Approve any additional feed domains in `News.AllowedHosts`. Set `News.Enabled` to false to stop automatic imports. Review permitted use for the feeds you enable.

## Supabase roles and review accounts

Verified accounts default to `User`. The backend uses the protected Supabase `app_metadata.app_role` field to grant `Admin`. The previous local `AdminUserIds` setting is obsolete.

In an isolated Supabase test project, create these accounts under **Authentication → Users**. Choose a unique password for each account and keep the passwords outside Git. For seeded accounts, use the dashboard's email confirmation option.

| Test account | Role | Expected result |
| --- | --- | --- |
| `admin@admin.com` | `Admin` | Feed and admin panel available |
| `user@user.com` | `User` | Feed available, admin API returns 403 |

In the Supabase SQL Editor, replace the placeholder UUID with the admin test user's ID from Authentication → Users and run the following. Copy the UUID carefully and verify the returned row. For the standard test account, leave the role unset or run the same statement with its UUID and `'User'`.

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('app_role', 'Admin')
where id = 'REPLACE_WITH_ADMIN_USER_UUID'::uuid
returning id, email, raw_app_meta_data ->> 'app_role' as app_role;
```

Sign in as each account and open `/admin`. The backend checks the protected role through the Supabase Auth API. [Supabase user metadata and authorization](https://supabase.com/docs/guides/auth/managing-user-data)

After bootstrapping the first administrator, add a Supabase `sb_secret_...` key as `Supabase.SecretKey` in the ignored backend local settings, or set `Supabase__SecretKey` in the backend environment. Restart the backend. In **Administration → Users**, search for the account by email and use **Make admin** or **Make user**. This key also lets the delivery worker resolve the current verified email. Keep it out of frontend configuration and Git.

## Email and Slack delivery

- **Profile → Delivery channels** starts with email selected and Slack unselected. Both use the verified Supabase account address.
- **Administration → Delivery channels** provides SMTP and Slack bot settings, global controls and recent outcomes. Provider secrets are encrypted in SQLite and hidden from subsequent reads. See [local setup](docs/local-setup.md#email-slack-and-rss).
- Email alerts use the application's blue HTML template with a plain-text alternative. [Brevo SMTP setup](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)
- Slack uses an installed bot to find the matching account in its workspace and send a direct message. An account absent from that workspace cannot receive the DM.
- Deliveries use a persisted queue. `Accepted` means the provider acknowledged the request. `Ambiguous` means the app could not confirm the outcome and will avoid automatically resending that attempt.
- To add a new channel type, implement `INotificationSender` and register it in the backend. Channel preferences, global switches and queue processing use the registered adapters.

Users can like articles in the feed and open **Liked posts** from the account menu. Likes are stored per account in SQLite.

From `frontend/`, run `npm run lint` for Angular and TypeScript lint checks and `npm run format:check` for Prettier. Use `npm run format` to apply the formatting.

## What the app will do

- Browse an English-language news feed by topic and set alerts using tags, keywords or exact phrases. Choose which eligible news sources a rule watches.
- Receive alerts in the app and through email or Slack. Email is the default external channel. Slack is available when an administrator has configured a destination.
- Register with email, verify your address, reset your password and delete your account from your profile.

The first demo focuses on RSS news. BBC World RSS and USGS were verified in a live import smoke check. Confirmation of permitted use is still pending for the BBC feeds. Price alerts are an optional extension.

## What administrators can configure

- **News sources:** Add approved RSS, Atom and USGS feeds, assign them to topics and run imports on demand. Scheduled polling is configured on the backend.
- **Users and rules:** Manage accounts and edit or pause saved alert rules, including their topics, tags, keywords, phrases and selected sources.
- **Delivery channels:** Configure and test destinations for supported channels, and enable or disable a channel globally. The admin panel will show import and delivery outcomes.

## Architecture

The mobile-friendly frontend will use Angular, NgRx and Tailwind CSS. An ASP.NET Core backend will use EF Core with SQLite for application data and Supabase Auth for accounts. A background service will import approved RSS feeds, deduplicate articles and check saved rules. The backend will save notifications before using SignalR to refresh connected clients. Email and Slack will use separate adapters behind a shared delivery interface.

The app can support more news providers by adding source adapters for their APIs. Rules can use the same topics, tags and keywords across eligible sources, and the matching logic can be extended with new conditions. Additional alert channels can be integrated through the shared delivery interface and configured in the admin panel once their adapters are available.

## Project documents

- [Product plan](PLAN.md)
- [Architecture brief](architecture-brief.pdf)
- [Implementation and review milestones](MILESTONES.md)
- [Repository instructions](AGENTS.md)
- [Development log](docs/development-log.md)
- [Windows CMD and integration setup](docs/local-setup.md)
