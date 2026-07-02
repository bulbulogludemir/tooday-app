# Self-Hosting

tooday is designed to be easy to run on your own machine or server. There is no
hosted subscription service in the default path.

## Current Runtime

- Next.js app served with `next start`.
- Static app routes generated at build time.
- Browser-local storage for plans, categories, todos, templates, settings, and
  Pomodoro state.

## Server Runbook

```bash
git clone git@github.com:bulbulogludemir/tooday.git
cd tooday
npm ci
npm run build
npm run start -- --port 3210
```

For updates:

```bash
git pull
npm ci
npm run build
# restart your process manager
```

## Reverse Proxy

Put a reverse proxy in front of the Node process in production. Example nginx
shape:

```nginx
server {
  server_name tooday.example.com;

  location / {
    proxy_pass http://127.0.0.1:3210;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Current Storage Caveat

The first public version uses browser-local persistence. A server install lets
you access the app from a stable URL, but the actual planner data still lives in
the browser profile that created it.

Planned next layer:

- local export/import;
- optional SQLite-backed self-host sync;
- explicit migration from browser-local data;
- no hosted default account.
