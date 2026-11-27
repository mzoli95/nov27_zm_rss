# World Event Alerts

World Event Alerts is a planned web app for following world news and receiving alerts about topics you care about. The repository currently contains the product plan and architecture. The application shell and authentication are the next milestone.

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
- [Windows CMD and integration setup](docs/local-setup.md)
