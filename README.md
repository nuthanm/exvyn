# Exvyn

Upload Excel. Exvyn frames a unique visual from whatever is in your workbook.

## Flow

Upload → Visualize (metrics exports open with filters ready). Adjust mapping only if needed.

**No sign in. No storage on our system.** Files stay in browser memory — close the tab and the data is gone.

## Run

```bash
npm install
npm run samples
npm run dev
```

Open http://127.0.0.1:5173

## Azure Static Web Apps

1. Create an Azure Static Web App.
2. Add GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.
3. Push to `main` — the workflow builds and deploys `dist`.

## Stack

React · TypeScript · Vite · SheetJS · html-to-image · Azure Static Web Apps
