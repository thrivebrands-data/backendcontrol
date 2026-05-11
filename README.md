## Thrive Control Backend

### Dev (local)

- Copy `.env.example` to `.env` and fill required values (Mongo/MySQL as needed).
- Start the server:

```bash
npm run dev
```

Default port is `9876` (set `PORT` to change).

### Deployment (server)

- Build and start:

```bash
npm run build
npm start
```

### CORS note

Recommended setup is to deploy the frontend (Next.js) with a proxy rewrite:

- Frontend calls `"/api/*"`
- Next proxies to backend using `API_PROXY_TARGET`

In that setup, the browser is calling the frontend origin, so CORS is typically not needed.
If you point the browser directly to the backend (using `NEXT_PUBLIC_API_BASE_URL`), set `CORS_ORIGINS` to your frontend domain(s).

