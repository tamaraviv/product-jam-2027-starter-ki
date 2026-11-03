# Design Document: Parts 1 & 2

This document describes the database schema, API endpoints, and architectural
trade-offs for Part 1 (Tic-tac-toe) and Part 2 (NASA Space Pictures).

---

## 1. The Database

### Table `games`

Stores completed games of Tic-tac-toe for logged-in users. Each row represents a
single played game whose validity and outcome were replayed and verified on the
server.

| Column       | Type          | Rules / Constraints                                           |
| ------------ | ------------- | ------------------------------------------------------------- |
| `id`         | `uuid`        | primary key, default `gen_random_uuid()`                      |
| `owner_id`   | `uuid`        | foreign key to `auth.users(id)` on delete cascade, `not null` |
| `variant`    | `text`        | `not null`, `check (variant = 'no-center')`                   |
| `moves`      | `jsonb`       | `not null`, ordered array of cell indices (e.g. `[0, 1, 2]`)  |
| `result`     | `text`        | `not null`, `check (result in ('x_won', 'o_won', 'draw'))`    |
| `created_at` | `timestamptz` | `not null`, default `now()`                                   |

- **Index:** `games_owner_id_created_at_idx` on `(owner_id, created_at desc)`
  for fast retrieval of the user's game history.
- **Security:** Row Level Security (RLS) is enabled with no policies. The server
  uses the Supabase service role key, bypassing RLS and enforcing user ownership
  in code (`owner_id = c.get("user").id`).

---

### Table `nasa_pictures` (NASA pictures)

Caches Gemini-generated Hebrew explanations and NASA APOD metadata. Because NASA
Astronomy Picture of the Day entries are unique per date and independent of
individual users, translations are cached globally so that an explanation is
generated only once for any given date.

| Column                | Type          | Rules / Constraints                                |
| --------------------- | ------------- | -------------------------------------------------- |
| `date`                | `text`        | primary key (format: `YYYY-MM-DD`)                 |
| `english_title`       | `text`        | `not null`                                         |
| `english_explanation` | `text`        | `not null`                                         |
| `media_type`          | `text`        | `not null`, default `'image'`                      |
| `image_url`           | `text`        | `not null`                                         |
| `hebrew_title`        | `text`        | `not null`                                         |
| `hebrew_summary`      | `text`        | `not null` (2–3 simplified Hebrew sentences)       |
| `tags`                | `jsonb`       | `not null`, array of 1–5 strings from allowed list |
| `created_at`          | `timestamptz` | `not null`, default `now()`                        |

- **Security:** RLS enabled with no policies. Only the server interacts with
  this table using its admin client.

---

## 2. The API

_(Note: Per assignment instructions, all endpoints below require an
authenticated session and automatically answer `401 Unauthorized` if the session
token is missing or invalid. `401` is therefore omitted from the individual
listings)._

---

### `GET /api/games`

Lists the logged-in user's past games, newest first.

- **Receives:** Nothing in body or params (identifies user from session token).
- **Answers:** `200 OK` with an array of game objects:
  ```json
  [
    {
      "id": "c1f7b764-70a2-4a7b-b8cf-d07f3521b7e0",
      "owner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "variant": "no-center",
      "moves": [0, 1, 2, 3, 6],
      "result": "x_won",
      "created_at": "2026-11-03T18:00:00.000Z"
    }
  ]
  ```
- **Errors:**
  - `500 Internal Server Error` if the database query fails.
- **Tables:** Reads `games`, filtered by `owner_id = c.get("user").id`.

---

### `POST /api/games`

Saves a finished Tic-tac-toe game. The client sends solely the sequence of
moves. The server uses the shared pure game engine (`shared/game/`) to replay
and verify every move, enforce the `no-center` rules, calculate the verified
result, and persist the record.

- **Receives:**
  ```json
  {
    "moves": [0, 1, 2, 5, 8]
  }
  ```
- **Answers:** `201 Created` with the newly inserted row:
  ```json
  {
    "id": "c1f7b764-70a2-4a7b-b8cf-d07f3521b7e0",
    "owner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "variant": "no-center",
    "moves": [0, 1, 2, 5, 8],
    "result": "x_won",
    "created_at": "2026-11-03T18:00:00.000Z"
  }
  ```
- **Errors:**
  - `400 Bad Request` if input is malformed (e.g. `moves` is missing, not an
    array of integers between 0 and 8, or contains the forbidden center index
    4).
  - `400 Bad Request` if the game is invalid or illegal (e.g. playing on an
    occupied cell, out of turn, unfinished game, or moves played after a player
    already won).
  - `500 Internal Server Error` if the database insert fails.
- **Tables:** Writes to `games` with `owner_id = c.get("user").id`.

---

### `GET /api/nasa/apod`

Fetches a list of random astronomy pictures from NASA's APOD API and augments
them with existing cached Hebrew translations where available.

- **Receives:** Optional query parameter `count` (integer between 1 and 20,
  default 10). Example: `/api/nasa/apod?count=10`.
- **Answers:** `200 OK` with an array of APOD objects:
  ```json
  [
    {
      "date": "2024-05-12",
      "title": "A Northern Spring Sky",
      "explanation": "English explanation from NASA...",
      "media_type": "image",
      "url": "https://apod.nasa.gov/apod/image/...",
      "hebrew": {
        "title": "שמי אביב בצפון",
        "summary": "הסבר פשוט בעברית...",
        "tags": ["star", "galaxy"]
      }
    }
  ]
  ```
  _(Note: `hebrew` is `null` if the picture has not been translated yet)._
- **Errors:**
  - `400 Bad Request` if `count` is invalid (less than 1 or greater than 20).
  - `502 Bad Gateway` if NASA's API returns an error, invalid JSON, or times
    out.
  - `500 Internal Server Error` on unexpected server failure.
- **Tables:** Reads `nasa_pictures` to attach translations for returned dates.

---

### `POST /api/nasa/explain`

Generates or retrieves a cached Hebrew explanation and tags for a NASA APOD
picture. The browser submits **only the picture's date**. The server retrieves
the authentic title and explanation directly from NASA, queries Gemini via its
REST API using structured JSON output, validates the response with Zod, saves it
in `nasa_pictures`, and returns the result.

- **Receives:**
  ```json
  {
    "date": "2024-05-12"
  }
  ```
- **Answers:** `200 OK` with the translated explanation:
  ```json
  {
    "date": "2024-05-12",
    "hebrew_title": "שמי אביב בצפון",
    "hebrew_summary": "הסבר פשוט בעברית המתאים לילדים בני עשר.",
    "tags": ["star", "galaxy"],
    "cached": true
  }
  ```
- **Errors:**
  - `400 Bad Request` if `date` is missing, not a valid `YYYY-MM-DD` string, or
    refers to a future date.
  - `502 Bad Gateway` if NASA APOD API fails for that date, or Gemini REST API
    fails or produces an unparseable response.
  - `500 Internal Server Error` if database read/write fails.
- **Tables:** Reads from `nasa_pictures`. If not cached, writes the new
  explanation into `nasa_pictures`.

---

## 3. One Trade-Off: Authoritative Move Replay vs. Client-Reported Game State

**Decision:** When a Tic-tac-toe game concludes, the client transmits only the
sequential list of moves (`moves: number[]`) to `POST /api/games`, rather than
sending the final board state or the declared winner (e.g.
`{ result: "x_won", board: [...] }`).

**Alternatives Considered:**

1. **Client sends board state and winner:** The client calculates the outcome
   and sends `{ result: "x_won", board: [...] }`. The server merely checks if
   the winner matches the board.
2. **Client sends move list only (Chosen):** The client sends solely
   `{ moves: [0, 1, 2, ...] }`. The server replays the moves sequentially from
   an empty board using pure rule functions.

**Why We Chose Move Replay:** In web applications, the browser cannot be
trusted. If the client sends the declared outcome or final board state, a
malicious actor (or modified script in DevTools) could submit arbitrary winning
boards, skip turns, or claim a win in 2 moves without the server being able to
easily verify if that board was legally reachable under the variant's rules.

Even if the server checked 3-in-a-row on a submitted board, it could not verify
turn alternation, whether the game should have terminated earlier, or whether
illegal moves occurred. Replaying the move sequence step-by-step from move 0
ensures that:

- X moved first and players strictly alternated.
- No player selected the forbidden center square (cell 4).
- No move was made on an already occupied square.
- No moves were accepted after a decisive win occurred.
- The recorded result is computed authoritatively by the backend.

The trade-off is a tiny amount of server CPU time to replay at most 8 moves for
a $3 \times 3$ grid. This computational cost is negligible (under a fraction of
a millisecond) while providing absolute data integrity and security.
