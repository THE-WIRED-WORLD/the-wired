# THE WIRED

A small browser experience — about 1 minute long — inspired by *serial experiments lain*.

Live: https://the-wired-world.netlify.app

A CRT boots up. Your location becomes "HERE / THERE / SOMEWHERE." You see how many souls are connected to the Wired right now. It ends with: *"You are not alone. You are part of the Wired."*

No buttons. No sign-up. Just a small moment.

---

## Running locally

```bash
git clone https://github.com/THE-WIRED-WORLD/the-wired.git
cd the-wired
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

To build for production:

```bash
npm run build
npm run preview
```

## Configuration (optional)

Everything works out of the box without any configuration.

If you want a real-time souls counter, you can connect Supabase Presence. Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

A free Supabase project at [supabase.com](https://supabase.com) is enough. No database tables or functions are required — only the built-in Presence channel.

IP-based geolocation uses the public [ipapi.co](https://ipapi.co/) endpoint with no API key.

## Stack

- React 19 + Vite 8
- Tailwind CSS 4
- Supabase Realtime (Presence) — optional
- ipapi.co — IP geolocation

No routing library, no state management library. ~10 source files. The size matches the intent.

## Inspiration

- *serial experiments lain* (1998) — Chiaki J. Konaka, Yoshitoshi ABe, Ryutaro Nakamura
- The art book *an omnipresence in wired* (1999)
- A line from Layer:01 Weird that drove the design:

> Be aware that you are connected. Be yourself, be continued.
>
> — Chiaki J. Konaka

## License

MIT. See [LICENSE](./LICENSE).

This project is a fan tribute. *serial experiments lain*, its characters, and the art book *an omnipresence in wired* are the property of their respective copyright holders. No affiliation.
