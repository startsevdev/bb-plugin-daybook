# Daybook for BB

A Claude-style sidebar for people who switch between several projects throughout the day. Open a recent conversation, see which project it belongs to, and check how much provider quota you have before starting the next task.

## Install

With BB 0.49 or newer, run:

~~~sh
bb plugin install git:https://github.com/startsevdev/bb-plugin-daybook.git@v1.0.0
~~~

Choose **Daybook** as your thread list in **Settings → Appearance** if another list is selected.

## Inside the sidebar

- Pinned threads stay on top. Active conversations from all projects share one chronological list. Today and Yesterday show every thread. Other days in the past week start with six rows each. Older history expands twenty rows at a time.
- Use Activity, Created, or A–Z order. Running threads appear in Today in Activity order. Collapse any group. The sidebar remembers collapsed groups and sort order in this window.
- The project filter lists projects with activity or reads in visible active threads over the last 30 days first. Earlier projects follow alphabetically. Project labels help distinguish conversations with similar titles.
- Existing custom sections are separate and initially collapsed. Right-click a thread for BB’s actions.
- **Available quota** shows the remaining percentage in every window returned by BB and the next reset in local time when available. It checks on open and every five minutes while mounted. An unavailable window or reset is labeled explicitly.

Daybook uses BB’s sidebar and usage APIs. It does not read session files or credentials, send telemetry, or move threads between projects.

## Development

Run npm ci, npm run check, npm test, and npm run build with Node 22 and the BB CLI.
