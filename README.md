# Eniac

Full form: `Easier Navigation In AI Chats`

AI chat app with:

- multiple root chats
- branch chats that inherit hidden parent context
- sidebar tree navigation with collapse/expand
- branch tree view for main chats

## Project Structure

```text
backend/   Express API + Groq integration
frontend/  React + Vite client
```

Frontend chat code is organized under:

```text
frontend/src/chat/
```

Key files:

- `frontend/src/chat/ChatApp.jsx` - main chat UI and behavior
- `frontend/src/chat/storage.js` - local storage loading/persistence
- `frontend/src/chat/utils.js` - chat and tree helpers
- `frontend/src/chat/components/` - sidebar, tree, and message components
- `backend/index.js` - API entrypoint
- `backend/utils/groqapi.js` - model request wrapper

## Current Behavior

- `New chat` in the sidebar creates a fresh root conversation.
- `New branch` in the composer creates a child chat from the current chat.
- A branch keeps the full parent context for AI responses, but that inherited context is hidden from the branch UI.
- The sidebar shows chats as a tree:
  root chats -> branches -> nested branches
- Sidebar nodes can be collapsed.
- Deleting a chat deletes its full subtree.

## Local Storage

Chat data is currently stored in the browser, not in a database.

Storage keys:

- `eniac.simple-chat.workspace.v3`
- `eniac.simple-chat.sidebar.v1`

Because of that:

- users do not share chat history with each other
- chats are tied to a browser/device
- clearing browser storage removes saved chats

## Run Locally

### Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
GROQ_API_KEY=your_key_here
```

Start the backend:

```bash
node index.js
```

The API runs on `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Build / Check

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

## Notes

- The backend is stateless for chat history; every request sends the relevant context from the frontend.
- `frontend/README.md` is still the default Vite template README and can be replaced later if you want a frontend-specific guide.
