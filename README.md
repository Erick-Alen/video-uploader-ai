# Video Upload AI

A learning prototype from Rocketseat's NLW that explores turning a video transcript into suggestions for a YouTube title or description. The repository contains a React interface and a Fastify API. It is source code for an experiment, not a hosted service.

## What the project does

1. The interface takes an MP4 and uses FFmpeg in the browser to extract MP3 audio.
2. The API stores the audio reference and sends it to OpenAI's transcription API.
3. The user selects a prompt template seeded in SQLite: three YouTube titles or a short description with hashtags.
4. The API inserts the transcript into that template and streams generated text back to the interface.

The current prompt templates do **not** generate captions. The earlier README mentioned captions, but that feature is not implemented.

## How it is organized

| Directory | Responsibility |
| --- | --- |
| `video-upload-ai-frontend/` | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and browser-side FFmpeg |
| `upload-ai-backend/` | Fastify routes, multipart uploads, transcription, generated text, and Prisma models |
| `upload-ai-backend/prisma/` | SQLite schema for videos and prompt templates; seed data for title and description prompts |

The frontend calls the API at `http://localhost:3333`. The API stores uploaded audio locally and uses `OPENAI_API_KEY` for transcription and text generation.

## Local setup

You need Node.js, pnpm, and an OpenAI API key. The following commands reflect the repository scripts; the full flow has not been revalidated against current OpenAI models and dependencies.

In `upload-ai-backend/`:

```bash
pnpm install
```

Create a local `.env` file in that directory:

```dotenv
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="your-api-key"
```

Keep this file out of version control. Then run:

```bash
pnpm exec prisma migrate dev
pnpm exec prisma db seed
pnpm dev
```

In a second terminal, from `video-upload-ai-frontend/`:

```bash
pnpm install
pnpm dev
```

Open the local address printed by Vite. The backend listens on port 3333.

## Current limitations

- This is an educational prototype; there is no verified hosted demo.
- The generation route references the older `gpt-3.5-turbo-16k` model. Availability and behavior need checking before relying on the end-to-end flow.
- The browser-side FFmpeg flow has not been revalidated across current browsers.
- There is no captions workflow despite the old README claim.
