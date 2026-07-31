# Security Policy

## Supported versions

The `main` branch is the supported development line. This is an educational project; production use still requires an owner-reviewed deployment and environment configuration.

## Reporting a vulnerability

Do not open a public issue containing credentials, private URLs, request bodies, or exploit details. Contact the repository maintainers privately through the GitHub repository owner and include a minimal reproduction, affected commit, and a safe contact method.

Never include an API key, password, token, cookie, or `.env` file in a report.

## Security boundaries

- AI credentials are server-side only; the frontend does not include an OpenAI SDK or credential.
- Analyze and Generate requests and model output are validated with Zod and bounded by size/count/coordinate/text limits.
- CORS allows only exact configured frontend origins.
- AI routes are rate limited and upstream calls have timeouts.
- Request logs contain a correlation ID, method, path, status, and duration only; they do not contain prompts, canvas data, environment variables, or credentials.
- Generated content is preview-only until the user explicitly applies it.
- `.env`, `node_modules`, `dist`, logs, and test artifacts are ignored by Git.

