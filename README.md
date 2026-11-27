# World Event Alerts

World Event Alerts is a web app in development for following world news and receiving personalized alerts. The application shell includes authentication, a protected demo feed and an admin route. Live news ingestion and alert delivery are later milestones.

## Run the application shell

1. Install the .NET 11 SDK and Node.js 24.15 or newer in the Node 24 release line.
2. Copy `backend/appsettings.Local.example.json` to `backend/appsettings.Local.json`. Set your Supabase project URL and **publishable key**. Enable email/password registration and email confirmation. Allow `http://localhost:4200/` and `http://localhost:4200/update-password` as redirect URLs.
3. From `backend/`, set `ASPNETCORE_ENVIRONMENT=Development` and run `dotnet run --urls http://localhost:5090`. The API migrates SQLite on startup and seeds sample articles in Development.
4. From `frontend/`, run `npm ci` and `npm start -- --proxy-config proxy.conf.json`. Open `http://localhost:4200`.

Use the Supabase publishable key in this configuration. The API exposes it to Angular. The local configuration file, database and logs are excluded from Git.

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

## What the app will do

- Browse an English-language news feed by topic and set alerts using tags, keywords or exact phrases. Choose which eligible news sources a rule watches.
- Receive alerts in the app and through email or Slack. Email is the default external channel. Slack is available when an administrator has configured a destination.
- Register with email, verify your address, reset your password and delete your account from your profile.

The first demo focuses on RSS news. BBC World News is the initial source candidate, pending live validation and confirmation of permitted use. Price alerts are an optional extension.

## What administrators can configure

- **News sources:** Add approved RSS feeds, assign them to one or more topics, set polling intervals, test connections, and run imports on demand. Each source can be enabled or paused.
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
