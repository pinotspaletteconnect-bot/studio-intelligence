# Project Instructions

## Project Overview

This project is a web application for [describe the product].

The main goal is to:
- Help users [primary purpose]
- Provide [important feature]
- Integrate with [outside services]

## Current Priorities

1. Finish user authentication.
2. Build the main dashboard.
3. Connect the payment system.
4. Improve mobile usability.
5. Add automated tests.

## Technology

- Frontend: React and TypeScript
- Backend: Node.js
- Database: PostgreSQL
- Styling: Tailwind CSS
- Hosting: Vercel
- Repository: GitHub

## Project Structure

- `src/components/` — reusable interface components
- `src/pages/` — application pages
- `src/api/` — API requests and integrations
- `server/` — backend code
- `tests/` — automated tests
- `docs/` — project documentation

## Working Rules

- Preserve existing behavior unless a change is requested.
- Reuse existing components before creating new ones.
- Keep files small and focused.
- Do not place passwords or API keys in the repository.
- Do not remove user-created code without explaining why.
- Update documentation when behavior changes.
- Keep desktop and mobile layouts working.

## Before Making Changes

1. Inspect the existing implementation.
2. Check the current Git status.
3. Identify related tests.
4. Explain any significant assumptions.

## Verification

After making changes:

1. Run the automated tests.
2. Run the type checker.
3. Run the formatter or linter.
4. Test the affected user flow.
5. Report anything that could not be verified.

Useful commands:

- Install: `npm install`
- Start: `npm run dev`
- Test: `npm test`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`

## GitHub Workflow

- Create a separate branch for substantial work.
- Use clear commit messages.
- Do not push directly to the main branch.
- Open pull requests as drafts unless instructed otherwise.
- Summarize testing in the pull-request description.

## Decisions Requiring Approval

Ask before:

- Changing the database schema
- Adding a paid service
- Removing a major feature
- Replacing a core dependency
- Publishing or deploying to production
- Sending messages or emails externally

## Product Preferences

- Keep the interface simple and non-technical.
- Prefer clear language over jargon.
- Prioritize reliability over unnecessary features.
- Design mobile-first.
- Make important actions easy to undo.