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

## Deploy (GitHub Pages)

Site: https://nuthanm.github.io/exvyn/

1. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main` (or run the **Deploy to GitHub Pages** workflow).
3. Wait for the workflow to finish, then open the URL above.

Excel stays in the browser — upload or use the sample workbooks on the landing page.

## Stack

React · TypeScript · Vite · SheetJS · html-to-image · GitHub Pages
