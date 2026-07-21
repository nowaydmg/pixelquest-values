# Pixel Quest Values

Panel wartości przedmiotów Pixel Quest, wdrożony na Vercel z bazą Turso.

## Wymagania

- Node.js 20 lub nowszy
- baza Turso / libSQL
- projekt Vercel

## Konfiguracja bazy

1. Utwórz bazę Turso.
2. Uruchom w niej cały plik `turso-schema.sql`.
3. Skopiuj `.env.example` do `.env` i ustaw trzy zmienne:

```env
TURSO_DATABASE_URL=libsql://twoja-baza-twoja-organizacja.turso.io
TURSO_AUTH_TOKEN=token-z-turso
JWT_SECRET=dlugi-losowy-sekret
```

`JWT_SECRET` wygenerujesz np. poleceniem `openssl rand -hex 32`.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Strona statyczna będzie dostępna pod `http://localhost:8080`. Do testowania logowania i API lokalnie użyj `vercel dev`, ponieważ zwykły serwer statyczny nie uruchamia katalogu `api`.

## Wdrożenie na Vercel

W ustawieniach projektu Vercel dodaj dla środowiska Production i Preview:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `JWT_SECRET`

Następnie wypchnij zmiany do gałęzi połączonej z Vercel. Po deployu adres
`/api/auth/csrf` powinien zwrócić JSON z polem `csrfToken`.

## API

- `/api/auth/csrf`, `/api/auth/login`, `/api/auth/register`, `/api/auth/session`, `/api/auth/logout`
- `/api/items`
- `/api/trades/offers`, `/api/trades/requests`
- `/api/messages`, `/api/messages/notifications`
- `/api/users`, `/api/users/banned-ips`

Pierwsze utworzone konto otrzymuje rolę `owner`.
