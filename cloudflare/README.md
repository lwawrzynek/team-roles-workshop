# Live results server (Cloudflare Worker + D1)

The D1 database **team-roles-workshop-db** (Western Europe) already exists, with its tables created; `wrangler.toml` points to it.

## Deploy with commands (needs Node.js 18+)

```bash
git clone https://github.com/lwawrzynek/team-roles-workshop.git
cd team-roles-workshop/cloudflare
npx wrangler login
npx wrangler deploy
```

`wrangler deploy` prints the address, e.g. `https://team-roles-live.<your-subdomain>.workers.dev`.
Paste it in the app: instructor view → **Classes & groups** → **Live results** → **Connect**.

## Or deploy in the Cloudflare dashboard (no installation)

1. Workers & Pages → Create → Create Worker → name `team-roles-live` → Deploy.
2. Edit code → replace everything with `src/index.js` from this folder → Deploy.
3. Settings → Bindings → Add → D1 database → variable name `DB`, database `team-roles-workshop-db` → Deploy.
4. Copy the `…workers.dev` address and paste it in the app.

## API
- `GET ?action=init&key=…` – the first call stores the instructor key (the app does this when you click Connect)
- `GET ?action=list&key=…&k=<class id>` – the instructor reads one class
- `POST {k, d, n, t, code}` – a student device saves or updates its answer
