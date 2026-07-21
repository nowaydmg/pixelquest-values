# 🚀 INSTRUKCJA SETUP — Pixel Quest Values

Wykonaj te kroki **po kolei**. Wszystko co trzeba wkleić jest poniżej.

---

## KROK 1: Supabase — Schema bazy danych

1. Otwórz https://supabase.com/dashboard
2. Wybierz swój projekt (lub utwórz nowy)
3. W menu po lewej: **SQL Editor**
4. Kliknij **New query**
5. Otwórz plik `supabase-schema.sql` z tego repozytorium
6. **Skopiuj CAŁĄ zawartość** i wklej do edytora SQL
7. Kliknij **Run** (lub Ctrl+Enter)

Powinieneś zobaczyć: `Success. No rows returned`

---

## KROK 2: Supabase — Auth (logowanie)

1. **Authentication** → **Providers** → **Email**
2. **Wyłącz** opcję **Confirm email** (Confirm email = OFF)
3. **Authentication** → **URL Configuration**:
   - Site URL: `http://localhost:8080` (lub URL z Vercel po deployu)
   - Redirect URLs: dodaj `http://localhost:8080/**`

---

## KROK 3: Supabase — Klucze API

1. **Project Settings** (ikona koła zębatego) → **API**
2. Skopiuj:
   - **Project URL** → np. `https://xxxxx.supabase.co`
   - **anon public** key → klucz publiczny

3. Otwórz plik `supabase-config.js` i wklej:

```javascript
const SUPABASE_URL = 'WKLEJ_PROJECT_URL';
const SUPABASE_ANON_KEY = 'WKLEJ_ANON_KEY';
```

---

## KROK 4: Test lokalny

W terminalu w folderze projektu:

```bash
npm install
npm run dev
```

Otwórz przeglądarkę: **http://localhost:8080**

1. Kliknij **Register**
2. Wpisz nick i hasło (min. 6 znaków)
3. Zaloguj się — pierwszy user = **owner**

---

## KROK 5: Deploy na Vercel

### Opcja A — przez CLI

```bash
npm install -g vercel
vercel login
vercel
```

### Opcja B — przez GitHub

1. Wypchnij repo na GitHub
2. Wejdź na https://vercel.com → **Add New Project**
3. Importuj repozytorium
4. Deploy (Vercel wykryje static site automatycznie)

### Zmienne środowiskowe w Vercel

**Settings** → **Environment Variables** → dodaj:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | twój Project URL |
| `SUPABASE_ANON_KEY` | twój anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (z Supabase → API → service_role) |

Po deployu zaktualizuj **Site URL** w Supabase Auth na URL z Vercel.

---

## KROK 6: Sprawdzenie API

Po deployu otwórz:

```
https://TWOJA-APP.vercel.app/api/health
```

Powinno zwrócić JSON z `"status": "ok"` i `"database": "ok"`.

---

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|-------------|
| "Supabase not initialized" | Sprawdź klucze w `supabase-config.js` |
| "User profile not found" | Uruchom ponownie `supabase-schema.sql` (trigger) |
| "Invalid login credentials" | Wyłącz Confirm email w Supabase Auth |
| "permission denied" / RLS error | Upewnij się że schema SQL został uruchomiony w całości |
| Dane nie synchronizują się | Sprawdź czy jesteś zalogowany (RLS wymaga auth) |

---

## Co robi każdy plik

- `supabase-schema.sql` — **WKLEJ W SUPABASE** — tabele + RLS + trigger profilu
- `supabase-config.js` — URL i klucz anon (frontend)
- `db.js` — wszystkie operacje na bazie
- `auth.js` — logowanie / rejestracja
- `script.js` — interfejs użytkownika
- `api/health.js` — endpoint health check na Vercel
- `api/admin/user-action.js` — ban/unban przez service_role

---

Gotowe! 🎮
