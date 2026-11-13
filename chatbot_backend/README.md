# Lumen Complaint-Writing Chatbot

Small standalone FastAPI adapter for Lumen AI Chat. It creates a Lumen session,
sends a request to rewrite the citizen's notes as a factual complaint draft,
then returns Lumen's send response and message history. The citizen must review
and edit the generated draft before submitting a complaint. The prompt explicitly
asks Lumen not to invent details or assess severity.

## Configure

Add these values to `lumen/.env` (do not commit real credentials):

```env
LUMEN_API_KEY=your-api-key
LUMEN_API_SECRET=your-api-secret
LUMEN_API_BASE_URL=https://api.staging.nonlive.lumen.bayanichain.tech
LUMEN_CHAT_INSTANCE_ID=your-chat-instance-id
JWT_SECRET=your-existing-app-jwt-secret
```

Use the same `JWT_SECRET` and algorithm as the accounts/complaints API. The
chat endpoint accepts citizen JWTs only. Obtain the chat instance ID from
`GET /ai_chat/instances` using the credentials, or use the local
`GET /instances` proxy after configuration.

## Run

From this folder, install `requirements.txt` and run:

```text
uvicorn app:app --reload --port 8003
```

The citizen UI uses `POST http://127.0.0.1:8003/sessions` to create a chat and
`POST http://127.0.0.1:8003/messages` for each message. Both require a bearer
citizen token. The session response contains a signed, short-lived token that
ties the Lumen session to that citizen. The messages endpoint returns normalized
`{role, content}` history for the chat window.

For compatibility, `POST http://127.0.0.1:8003/complaint-drafts` still accepts
a bearer citizen token and JSON body:

```json
{"message":"There is a pothole near the school entrance and it is hard to see at night."}
```

It returns the Lumen session ID, send result, and message history. This keeps
the adapter tolerant of Lumen's exact response object while the team validates
the sandbox response shape. The Lumen message endpoint and history endpoint
are called according to the provided cURL examples.

The Next.js citizen report form calls these endpoints through the same-origin
`/chatbot` proxy. Set `CHATBOT_PROXY_TARGET=http://127.0.0.1:8003` in
`lumen/apps/web/.env.local` if the chatbot runs elsewhere, then restart the
Next.js dev server. Run the chatbot service alongside the accounts API and
Next.js app. The assistant appears on the complaint description step; residents
can apply a suggestion and edit it before sending the report.

## Current limits

- No chat history is persisted locally; Lumen owns the session history.
- A new Lumen session is created for every draft request.
- The endpoint returns Lumen's history rather than extracting a final draft
  field because the exact Lumen response schema has not yet been supplied.
- Do not send secrets or unnecessary personal information in the citizen notes.
