# Pixel Quest Values

Modern item vault for Pixel Quest game items — **Supabase backend + Vercel hosting**.

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Frontend | HTML, CSS, Vanilla JS |
| Baza danych | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel (static + serverless API) |
| Bezpieczeństwo | Row Level Security (RLS) |

## Szybki start

### 1. Supabase — wklej SQL

1. Wejdź na [supabase.com](https://supabase.com) → twój projekt
2. **SQL Editor** → New query
3. Skopiuj całą zawartość pliku **`supabase-schema.sql`** i uruchom (Run)

### 2. Supabase — wyłącz potwierdzenie email

1. **Authentication** → **Providers** → **Email**
2. Wyłącz **Confirm email** (dla testów lokalnych)
3. W **Authentication** → **Settings** → dodaj do **Site URL**: `http://localhost:8080`

### 3. Klucze API

1. **Project Settings** → **API**
2. Skopiuj **Project URL** i **anon public** key
3. Wklej do `supabase-config.js`:

```javascript
const SUPABASE_URL = 'https://TWOJ-PROJEKT.supabase.co';
const SUPABASE_ANON_KEY = 'twoj-anon-key';
```

### 4. Lokalnie

```bash
npm install
npm run dev
```

Otwórz: http://localhost:8080

Pierwszy zarejestrowany użytkownik dostaje rolę **owner** automatycznie.

### 5. Deploy na Vercel

```bash
npm i -g vercel
vercel
```

W Vercel Dashboard → **Settings** → **Environment Variables**:

| Zmienna | Wartość |
|---------|---------|
| `SUPABASE_URL` | URL projektu Supabase |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (tylko dla API) |

## API routes (Vercel)

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/health` | GET | Status serwisu + połączenie z DB |
| `/api/admin/user-action` | POST | Ban/unban użytkownika (service_role) |

Przykład ban:

```bash
curl -X POST https://twoja-app.vercel.app/api/admin/user-action \
  -H "Content-Type: application/json" \
  -d '{"username":"gracz1","action":"ban"}'
```

## Struktura plików

```
pixel-quest-prices/
├── index.html          # Logowanie / rejestracja
├── dashboard.html      # Główna aplikacja
├── auth.js             # Supabase Auth
├── db.js               # Warstwa danych (CRUD)
├── script.js           # UI i logika frontendu
├── supabase-config.js  # URL + anon key
├── supabase-schema.sql # Schema bazy — WKLEJ W SUPABASE
├── api/
│   ├── health.js
│   └── admin/user-action.js
├── vercel.json
└── .env.example
```

## Role

- **owner** — pełny dostęp, pierwszy użytkownik
- **admin** — zarządzanie itemami, banowanie
- **moderator** — raporty, ostrzeżenia
- **user** — podstawowy dostęp

## Logowanie

Użytkownicy logują się **nickiem** (Player ID). W tle tworzony jest email: `nick@pixelquest.local`.

## License

MIT
