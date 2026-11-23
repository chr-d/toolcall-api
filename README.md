# Tool Calling API

A TypeScript and Express API that uses Claude tool calls to list upcoming events, look up event details, and create or update events through the [Events API](https://github.com/WebDev-WBSCodingSchool/events-api).

## Run locally

Use Node.js 24 or newer and npm. Start the [Events API](https://github.com/WebDev-WBSCodingSchool/events-api) separately, then run these commands from this project’s root directory.

```sh
npm ci
cp .env.example .env
```

Set `ANTHROPIC_API_KEY` in `.env` and point `EVENTS_API_URL` to the running Events API (defaults to `http://localhost:3001`). Set `EVENTS_API_TOKEN` to an Events API bearer token if you want to create or update events. Use `LLM_MODEL` to select the Claude model.

```sh
npm run dev
```

## Use the API

Send a natural-language `message` to `POST /assistant`. The server returns a JSON object with a `reply` string.

```sh
curl http://localhost:3000/assistant \
  -H 'Content-Type: application/json' \
  -d '{"message":"What upcoming events are in Berlin?"}'
```

For follow-up questions, include an optional `history` array of up to 10 prior messages in conversation order. Each entry has a `role` (`user` or `assistant`) and a `content` string.

This example uses a sample assistant reply. In your own request, use the `reply` returned by the previous call as the assistant entry’s `content`.

```sh
curl http://localhost:3000/assistant \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Where is that event taking place?",
    "history": [
      {"role": "user", "content": "What upcoming events are in Berlin?"},
      {"role": "assistant", "content": "The next event is the Winter Concert (event ID 42)."}
    ]
  }'
```
