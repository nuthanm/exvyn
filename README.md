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

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new) (or deploy via the Cursor Vercel extension).
3. Framework preset: Vite. Build command: `npm run build`. Output: `dist`.
4. After deploy, open your `*.vercel.app` URL.

Excel stays in the browser — upload or use the sample workbooks on the landing page.

## Stack

React · TypeScript · Vite · SheetJS · html-to-image · Vercel
