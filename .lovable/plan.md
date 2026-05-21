# Fix Netlify 404 on Page Refresh

## Problem
Your app uses React Router (`BrowserRouter`), which handles routes client-side. When you refresh `/signup` directly, Netlify looks for a file at that path, doesn't find one, and returns 404. The fix is telling Netlify to fall back to `index.html` for unknown paths so React Router can take over.

Note: This is Netlify-specific. Lovable's own hosting handles this automatically, which is why the preview works fine.

## Change
Create one file: **`public/_redirects`** with the following single line:

```
/*    /index.html   200
```

Vite copies everything in `public/` to the build output as-is, so this file will end up at the root of your deployed site. Netlify reads `_redirects` automatically and will serve `index.html` (with a 200 status, not a redirect) for any path that doesn't match a real file — letting React Router handle `/signup`, `/signin`, `/dashboard/*`, etc.

## After the change
1. Redeploy to Netlify (push to your connected branch, or trigger a manual deploy).
2. Refresh `https://dashboard.konnectik-cm.site/signup` — it should now load correctly.

## Alternative (not recommended here)
A `netlify.toml` with a `[[redirects]]` block would do the same thing, but `public/_redirects` is the minimal change and keeps config out of your repo root.
