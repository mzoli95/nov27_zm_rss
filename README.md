# World Event Alerts

World Event Alerts is a planned web app for following world news and receiving alerts about topics you care about. The repository currently contains the product plan and architecture. The application shell and authentication are the next milestone.

## What the app will do

- Browse an English-language news feed by topic and set alerts using tags, keywords or exact phrases. Choose which eligible news sources a rule watches.
- Receive alerts in the app and through email or Slack. Email is the default external channel. Slack is available when an administrator has configured a destination.
- Register with email, verify your address, reset your password and delete your account from your profile.
- Give administrators a place to manage users, alert rules, RSS sources, import schedules and delivery channels. The admin panel will show import and delivery outcomes.

The first demo focuses on RSS news. BBC World News is the initial source candidate, pending live validation and confirmation of permitted use. Price alerts are an optional extension.

## Architecture

The mobile-friendly frontend will use Angular, NgRx and Tailwind CSS. An ASP.NET Core backend will use EF Core with SQLite for application data and Supabase Auth for accounts. A background service will import approved RSS feeds, deduplicate articles and check saved rules. The backend will save notifications before using SignalR to refresh connected clients. Email and Slack will use separate adapters behind a shared delivery interface.

## Project documents

- [Product plan](PLAN.md)
- [Architecture brief](architecture-brief.pdf)
- [Implementation and review milestones](MILESTONES.md)
- [Repository instructions](AGENTS.md)
- [Development log](docs/development-log.md)
