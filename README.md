# Personal Life Tracker (mynarcOS-v2) MVP Milestone

This document defines the first milestone for the Personal Life Tracker
application. It is a working agreement for the MVP development process.

The goal is to build a simple personal reflection system that helps a user
record daily experiences, review progress over time, and convert unstructured
journaling into structured data.

The MVP should prioritize function and reliability before advanced AI features
or visual polish.

## Project goal

Personal Life Tracker is a private self-reflection and progress tracking
application.

It combines:

- Daily journaling.
- Structured personal data collection.
- AI-assisted reflection.
- Historical progress visualization.

The application is inspired by personal journals, health dashboards, GitHub
contribution graphs, and game-like status systems.

The MVP must prove this main product loop:

1. A user opens the application.
2. The user completes a daily check-in.
3. The application stores the entry.
4. The user can revisit previous days.
5. The user can export structured data for AI analysis.
6. AI-generated insights can be imported back into the application.
7. The user can observe personal trends over time.

## MVP scope

### Included

- Personal daily check-in page.
- One journal entry per day.
- Create, read, update, and delete journal entries.
- Editing today's entry.
- Viewing previous entries.
- Structured JSON import.
- Structured JSON export.
- Basic progress dashboard.
- Mood and personal metric tracking.
- Mobile-friendly web interface.
- Database persistence.
- User-friendly empty, loading, and error states.
- A single reusable card pattern for dashboard stats, so panels stay visually
  consistent as more are added.

### Not included

- Real-time AI chat companion.
- Live AI agent / API integration for generating insights. AI analysis is
  produced manually (paste the exported JSON into a normal AI chat session,
  then import the response) rather than via an automated agent, to avoid
  repeating a past project's token-cost overrun.
- Automatic psychological diagnosis.
- Automatic burnout prediction.
- Complex machine learning models.
- Social features.
- Public profiles.
- Gamification systems.
- Native mobile application.
- Advanced animations.
- Full offline support.

These features can be considered after the core tracking system works.

## Product rules

- The application is designed for personal use.
- A user should be able to complete a check-in within a few minutes.
- The application must not feel like a chore.
- The interface should encourage consistent reflection.
- The system stores personal data owned by the user.
- AI is used as an assistant, not as an authority.
- AI-generated insights must remain editable.
- The database structure should remain flexible for future features.

The app should feel:

- Calm.
- Clear.
- Encouraging.

The app should avoid feeling:

- Overly corporate.
- Overly clinical.
- Overwhelming.

## Daily check-in system

Each day has one main journal entry.

A journal entry contains:

- The user's reflection.
- Personal scores.
- Events.
- Accomplishments.
- Challenges.
- Tomorrow's plans.
- Optional AI-generated analysis.

Example flow:

```
Open app

↓

Check if today's entry exists

↓

If no:
Create new entry

If yes:
Load existing entry for editing

↓

Save changes
```

## Technology

- HTML.
- CSS.
- Vanilla JavaScript.
- Supabase.
- PostgreSQL.
- Chart.js (via CDN) or a hand-rolled SVG/CSS-grid heatmap for the
  contribution-style graph — decide once the dashboard's real data shape is
  known.
- Progressive Web App (future).

No framework, no build step, no bundler. This matches the stack already used
successfully on Safe2Save, and keeps the project deployable as a plain static
site (same as myta-catalogue) rather than needing a Node build pipeline.

The application should use a standard database structure that allows future
growth.

If the app's complexity later outgrows plain JS — heavy client state, many
interdependent views — that's the natural point to reconsider a framework,
with a working reference app already in hand instead of a blank slate.

## Development approach

The application should be built incrementally.

Each milestone should:

- Introduce one major feature.
- Explain important technical decisions.
- Be tested before continuing.

Avoid generating the entire application at once.

The developer should understand the code being written.

## Milestone plan

### Milestone 1: Foundation

- [x] Create the static page skeleton (`index.html`, `check-in.html`,
      `progress.html`) with shared navigation.
- [x] Set up `css/style.css` with a dark theme + teal accent, using CSS
      variables so colors/spacing are defined once and reused.
- [x] Build a single reusable JS template function for rendering dashboard
      stat cards, instead of duplicating HTML per card — this is the direct
      fix for inconsistent-looking panels.
- [ ] Wire up the Supabase client (`js/supabase.js`) with safe key handling —
      no secrets committed.
- [ ] Confirm the Supabase connection works (a simple console-log ping is
      enough at this stage).
- [x] Add empty-state placeholders on all dashboard cards.
- [x] Confirm the site runs locally via a static file server, no build step
      required.

### Milestone 2: Daily journal

- [ ] Create the daily check-in page.
- [ ] Build the journal form in plain HTML/JS.
- [ ] Add mood tracking.
- [ ] Add reflection questions.
- [ ] Save form state to a local JS variable (draft only) before wiring up
      the database in Milestone 3.

Questions:

- How was your day?
- What happened today?
- What did you accomplish?
- What drained you?
- What is happening tomorrow?

### Milestone 3: Database integration

- [ ] Connect Supabase.
- [ ] Create the `journal_entries` table.
- [ ] Save entries.
- [ ] Load existing entries.
- [ ] Edit entries.
- [ ] Delete entries.
- [ ] Double-check RLS policies and table grants explicitly — a missing
      GRANT previously caused a silent 403 bug on Safe2Save.

### Milestone 4: AI data workflow

- [ ] Create an AI analysis prompt generator (produces text you paste into a
      normal AI chat session — not a live agent call).
- [ ] Create the structured JSON format.
- [ ] Allow JSON import.
- [ ] Update existing entries from imported data.
- [ ] Support bulk historical imports.

## JSON data format

The application uses structured JSON as the bridge between AI tools and the
database.

Example:

```json
{
  "date": "2026-07-27",
  "mood": 7,
  "energy": 6,
  "stress": 4,
  "sleep_hours": 7.5,
  "summary": "Fixed database bugs and cooked dinner.",
  "wins": [
    "Finished coding task"
  ],
  "struggles": [
    "Low energy"
  ],
  "tomorrow": [
    "Continue project"
  ],
  "ai_insight": "Productive day with signs of fatigue."
}
```

The format may change, but compatibility should be maintained.

## Import behaviour

When importing JSON:

Single entry:

```
Receive JSON

↓

Check date

↓

Existing date:
Update entry

No existing date:
Create entry
```

Bulk import:

```
Receive array of entries

↓

For each entry:

    If date exists:
        Update

    Else:
        Create

↓

Show import summary
```

Example:

```
Imported:

Created: 25 entries
Updated: 120 entries
Failed: 2 entries
```

## Core data model

| Table | Main fields |
|---|---|
| `journal_entries` | `id`, `user_id`, `date`, `mood`, `energy`, `stress`, `sleep_hours`, `summary`, `wins`, `struggles`, `tomorrow`, `ai_analysis`, `created_at`, `updated_at` |

Useful values:

Mood:
- 1-10 scale

Energy:
- 1-10 scale

Stress:
- 1-10 scale

## Pages and actions

Since this is a static site with no server, there are no API routes — pages
are plain HTML files, and data operations are direct Supabase client calls
made from JS on that page.

| Page | File | Access |
|---|---|---|
| Home / dashboard | `index.html` | Private |
| Daily check-in | `check-in.html` | Private |
| View history | `progress.html` | Private |
| Save journal entry | Supabase `insert`/`update` call from `check-in.html` | Private |
| Import JSON | Supabase `upsert` call from an import page/section | Private |
| Export JSON | Client-side JSON.stringify + download, from `progress.html` | Private |

This can change during development. Keep it simple and consistent.

## Suggested project structure

```
index.html
check-in.html
progress.html
css/
  style.css
js/
  supabase.js
  cards.js
  journal.js
  import-export.js
assets/
```

Keep the project structure flat and small until complexity actually
requires more separation.

## Local setup

### Requirements

- A modern browser.
- A static file server (e.g. the VS Code "Live Server" extension, or
  `npx serve`, or `python -m http.server`).
- Supabase account.

### Run locally

Start a local static server in the project folder, for example:

```sh
npx serve .
```

Open:

```
http://localhost:3000
```

(Port may differ depending on the server used.)

## Git workflow

- Create branches for features.
- Keep commits focused.
- Test before merging.
- Avoid large untested changes.

Suggested branches:

```
feature/daily-checkin
feature/supabase-database
feature/json-import
feature/progress-dashboard
fix/journal-update
docs/mvp-milestone
```

## Definition of done

The MVP is complete when:

- A user can open the application.
- A user can complete a daily check-in.
- The entry is stored permanently.
- The same day can be edited later.
- Previous days can be viewed.
- JSON data can be imported.
- JSON data can update existing entries.
- Basic progress information can be displayed.
- The application works well on mobile.
- The project structure is understandable.

## Later features

- AI chat-style journaling.
- Automatic conversation flow.
- Burnout prediction.
- Personal pattern detection.
- GitHub-style contribution calendar.
- RimWorld-inspired status system.
- Advanced analytics.
- Habit tracking.
- Calendar integration.
- Better AI summaries.
- Native mobile app.
- Migrating to a framework (React/Next.js or similar), if the app's
  complexity genuinely outgrows plain JS — deferred deliberately rather than
  adopted upfront.
