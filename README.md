# Todo App — Coolify + PostgreSQL

A complete sample project: responsive Todo List UI, Express API, PostgreSQL persistence, Dockerfile, and Coolify GitHub deployment.

## Features
- Create, view, edit, complete/reopen, delete tasks
- Filter All / Active / Completed
- Persistent PostgreSQL table (auto-created at app startup)
- Health check: `GET /api/health`
- Responsive dashboard

**Important:** Demo/training application with no authentication. Do not expose personal or sensitive task data on a public deployment. Add login/authentication and HTTPS before production use.

## 1. Upload to GitHub (GUI)
1. Extract ZIP. Open `todo-app-coolify` folder.
2. On GitHub, click **New repository**. Name it `todo-app-coolify`, then **Create repository**.
3. On the empty repo page click **uploading an existing file** (or **Add file > Upload files**).
4. Drag files **and folders inside the extracted project** into the upload area. Ensure `Dockerfile`, `package.json`, `server.js`, and `public/` appear at repository root. Do not upload the ZIP as a single file.
5. Commit changes to `main`. Copy repository URL, e.g. `https://github.com/YOUR_USERNAME/todo-app-coolify`.

## 2. Create PostgreSQL in Coolify GUI (BEFORE deploying app)
1. Open your Coolify dashboard. In this internship environment the recorded URL is `http://43.250.81.58:8001/` — verify you control it; login over HTTPS/VPN for production use.
2. **Projects > New Project** (e.g., `Todo App`) > select **production** environment.
3. **+ New Resource > Database > PostgreSQL**.
4. Choose the intended server (`localhost` if Coolify runs on the same machine), choose the destination/network. Use the standard PostgreSQL image.
5. In database **General**, review generated username, password, initial database and volume; **Start**. Wait for `Running`/healthy.
6. Copy **Postgres URL (internal)** from database **General**. This is a secret. Never paste it into GitHub or client-side JavaScript.
7. Keep database **public access OFF**. PostgreSQL internal port is `5432` and should not need a firewall opening.

## 3. Deploy the app from GitHub (Coolify GUI)
1. Return to the same project and environment; click **+ New** or **New Resource**.
2. Choose **Public Repository** if GitHub repository is public (for private repo, connect GitHub App first).
3. Choose the **same server and destination/network** as PostgreSQL.
4. Paste repository HTTPS URL and choose **Check Repository**. Select `main` branch.
5. Set **Build pack / Build strategy: Dockerfile**.
6. Set **Base Directory: `/`**, **Dockerfile Location: `/Dockerfile`** (use default if detected).
7. Set **Ports Exposes / Internal Port: `3000`**. Do not set `8001` here: `8001` is your Coolify dashboard address, not this app's internal port.
8. Open the application's **Environment Variables** tab. Add `DATABASE_URL` = the **exact internal PostgreSQL connection URL** copied in step 2. Mark it secret/sensitive if available; use it only at **runtime** (not required at build time).
9. Optionally set `PORT=3000` and `NODE_ENV=production` (Dockerfile supplies defaults).
10. Configure the application's **Domain** to a hostname you control and point DNS to your server. For initial tests, use Coolify's generated/test domain if available. Prefer HTTPS.
11. Click **Save** then **Deploy**. Open **Deployment Logs**. Once successful, visit your app domain.
12. Open `https://YOUR_DOMAIN/api/health`: expected `{"status":"ok","database":"connected"}`. Then add a todo, refresh, and verify it stays saved.

### Database connection example (illustrative only)
`postgresql://USERNAME:PASSWORD@DATABASE_CONTAINER:5432/DATABASE_NAME`

Use **your own URL copied from Coolify**, not this example. If connection fails, verify app and DB are on the same Docker destination, DB is running, and the URL uses the database container hostname rather than a public IP.

## 4. Updating from GitHub
Commit a new change to `main`, then click **Redeploy** in Coolify. Automatic push deploys need a configured GitHub App or webhook; adding a public repository URL alone does not enable auto-deployment.

## 5. Local testing (optional)
1. Install Docker and Docker Compose.
2. Create `.env` with `POSTGRES_PASSWORD=a_strong_local_password` (do not commit it).
3. Run `docker compose up --build -d`.
4. Open `http://localhost:3000`; check `http://localhost:3000/api/health`.
5. Stop: `docker compose down` (keeps data). `docker compose down -v` **deletes database storage**.

## Useful endpoints
| Method | Endpoint | Function |
| --- | --- | --- |
| GET | `/api/health` | Check database connection |
| GET | `/api/todos` | List tasks |
| POST | `/api/todos` | Create `{ "title": "...", "description": "..." }` |
| PATCH | `/api/todos/:id` | Update title, description or completed |
| DELETE | `/api/todos/:id` | Delete task |

## Troubleshooting
- **Build failed**: confirm Dockerfile is at repo root and Build pack is Dockerfile.
- **Application starts then exits**: `DATABASE_URL` missing/wrong; check Runtime Logs.
- **Database connection refused**: DB not ready or app/DB not on same network; use internal URL.
- **502 error**: application may be unhealthy or internal port differs; use port `3000`.
- **Tasks disappear**: inspect database persistent volume, and ensure correct DB resource/URL.
- **URL `:8001`**: that is the recorded *Coolify dashboard* port. Configure a separate hostname for the Todo app.

## Official docs
- https://coolify.io/docs/applications/sources/github/public-repository
- https://coolify.io/docs/applications/builds/dockerfile
- https://coolify.io/docs/databases/postgresql
