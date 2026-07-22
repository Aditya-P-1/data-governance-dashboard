# Data Governance Dashboard

Phase 1 scaffold for a production-quality monorepo:

- `frontend/` for the React + Vite app
- `backend/` for the Express + Prisma API
- shared root tooling for linting, formatting, and workspace scripts

## Installed Tooling

- `react` and `react-dom` for the frontend UI runtime
- `react-router-dom` for client-side routing
- `axios` for HTTP requests from the frontend
- `vite` and `@vitejs/plugin-react` for frontend development and bundling
- `eslint-plugin-react` so JSX imports are handled correctly by linting
- `express` for the backend HTTP server
- `dotenv` for environment variable loading
- `cors` for API access from the frontend
- `prisma` and `@prisma/client` for database access and schema management
- `jest` and `supertest` for backend testing
- `nodemon` for backend development restart flow
- `concurrently` for running frontend and backend together from the root
- `eslint`, `@eslint/js`, `eslint-config-prettier`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, and `globals` for code quality checks
- `prettier` for consistent formatting

## Workspace Scripts

- `npm run dev` starts both apps together from the repo root
- `npm run dev:frontend` starts only the frontend
- `npm run dev:backend` starts only the backend
- `npm run lint` runs linting across both workspaces
- `npm run format` formats the repository with Prettier
- `npm run test` runs the backend test command

## Structure

```text
project-root
  frontend
  backend
  README.md
```

This phase intentionally contains only scaffolding and placeholder files. No business logic has been implemented yet.
