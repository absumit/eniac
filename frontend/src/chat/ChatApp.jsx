import { useEffect, useRef, useState } from "react";
import api from "../services/axios";
import BranchTreeNode from "./components/BranchTreeNode";
import MessageBody from "./components/MessageBody";
import SidebarChatNode from "./components/SidebarChatNode";
import {
  collectChatSubtreeIds,
  createChat,
  createMessage,
  deriveChatTitle,
  getAncestorChatIds,
  getChatContext,
  getChildChats,
  getRootChats,
} from "./utils";
import {
  loadSidebarUi,
  loadWorkspace,
  persistSidebarUi,
  persistWorkspace,
} from "./storage";
import "./chat.css";

function ChatApp() {
  const [workspace, setWorkspace] = useState(loadWorkspace);
  const [collapsedChatIds, setCollapsedChatIds] = useState(loadSidebarUi);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const activeChat =
    workspace.chats.find((chat) => chat.id === workspace.activeChatId) ??
    workspace.chats[0];
  const rootChats = getRootChats(workspace.chats);
  const messages = activeChat?.localMessages ?? [];
  const isBranchChat = Boolean(activeChat?.parentChatId);
  const childChats = activeChat ? getChildChats(workspace.chats, activeChat.id) : [];

  useEffect(() => {
    try {
      persistWorkspace(workspace);
    } catch {
      // Ignore persistence failures so the UI keeps working.
    }
  }, [workspace]);

  useEffect(() => {
    try {
      persistSidebarUi(collapsedChatIds);
    } catch {
      // Ignore persistence failures so the UI keeps working.
    }
  }, [collapsedChatIds]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [draft]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, isSending, activeChat?.id]);

  const createNewChat = () => {
    const newChat = createChat();

    setWorkspace((currentWorkspace) => ({
      activeChatId: newChat.id,
      chats: [newChat, ...currentWorkspace.chats],
    }));
    setDraft("");
    setErrorMessage("");
  };

  const selectChat = (chatId) => {
    if (chatId === workspace.activeChatId) {
      return;
    }

    const ancestorIds = getAncestorChatIds(workspace.chats, chatId);

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      activeChatId: chatId,
    }));
    setCollapsedChatIds((currentState) => {
      const nextState = { ...currentState };

      ancestorIds.forEach((ancestorId) => {
        delete nextState[ancestorId];
      });

      return nextState;
    });
    setIsTreeOpen(false);
    setDraft("");
    setErrorMessage("");
  };

  const toggleChatCollapse = (chatId) => {
    setCollapsedChatIds((currentState) => {
      const nextState = { ...currentState };

      if (nextState[chatId]) {
        delete nextState[chatId];
      } else {
        nextState[chatId] = true;
      }

      return nextState;
    });
  };

  const deleteChat = (chatId) => {
    const idsToDelete = new Set(collectChatSubtreeIds(workspace.chats, chatId));

    setWorkspace((currentWorkspace) => {
      const remainingChats = currentWorkspace.chats.filter(
        (chat) => !idsToDelete.has(chat.id),
      );

      if (remainingChats.length === 0) {
        const replacementChat = createChat();

        return {
          activeChatId: replacementChat.id,
          chats: [replacementChat],
        };
      }

      return {
        activeChatId:
          idsToDelete.has(currentWorkspace.activeChatId)
            ? remainingChats[0]?.id ?? null
            : currentWorkspace.activeChatId,
        chats: remainingChats,
      };
    });
    setCollapsedChatIds((currentState) =>
      Object.fromEntries(
        Object.entries(currentState).filter(
          ([storedChatId]) => !idsToDelete.has(storedChatId),
        ),
      ),
    );
    setDraft("");
    setErrorMessage("");
  };

  const appendAssistantReply = (chatId, assistantMessage) => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      chats: currentWorkspace.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              localMessages: [...chat.localMessages, assistantMessage],
              updatedAt: new Date().toISOString(),
            }
          : chat,
      ),
    }));
  };

  const sendMessageToChat = async ({ chatId, contextMessages, localMessages }) => {
    setIsSending(true);

    try {
      const response = await api.post("/", {
        messages: [...contextMessages, ...localMessages].map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      const assistantMessage = createMessage(
        "assistant",
        response.data?.response || "I couldn't generate a response.",
      );

      appendAssistantReply(chatId, assistantMessage);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error?.message ||
          "The assistant could not answer right now. Try again in a moment.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft || isSending || !activeChat) {
      return;
    }

    const userMessage = createMessage("user", trimmedDraft);
    const nextLocalMessages = [...activeChat.localMessages, userMessage];

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      chats: currentWorkspace.chats.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              localMessages: [...chat.localMessages, userMessage],
              title:
                chat.localMessages.length === 0
                  ? deriveChatTitle([userMessage], chat.title)
                  : chat.title,
              updatedAt: new Date().toISOString(),
            }
          : chat,
      ),
    }));
    setDraft("");
    setErrorMessage("");

    await sendMessageToChat({
      chatId: activeChat.id,
      contextMessages: activeChat.contextMessages,
      localMessages: nextLocalMessages,
    });
  };

  const createBranch = async () => {
    if (isSending || !activeChat) {
      return;
    }

    const trimmedDraft = draft.trim();
    const inheritedContext = getChatContext(activeChat);
    const branchUserMessage = trimmedDraft
      ? createMessage("user", trimmedDraft)
      : null;
    const branchLocalMessages = branchUserMessage ? [branchUserMessage] : [];
    const branchTitle = branchUserMessage
      ? deriveChatTitle(branchLocalMessages, `Branch from ${activeChat.title}`)
      : `Branch from ${activeChat.title}`;
    const branchChat = createChat({
      title: branchTitle,
      contextMessages: inheritedContext,
      localMessages: branchLocalMessages,
      parentChatId: activeChat.id,
    });

    setWorkspace((currentWorkspace) => ({
      activeChatId: branchChat.id,
      chats: [branchChat, ...currentWorkspace.chats],
    }));
    setDraft("");
    setErrorMessage("");

    if (!branchUserMessage) {
      return;
    }

    await sendMessageToChat({
      chatId: branchChat.id,
      contextMessages: branchChat.contextMessages,
      localMessages: branchChat.localMessages,
    });
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <main className="workspace-shell">
      <aside className="chat-sidebar">
        <button
          type="button"
          className="new-chat-button"
          onClick={createNewChat}
          disabled={isSending}
        >
          New chat
        </button>

        <div className="chat-history">
          <div className="sidebar-copy">
            <p className="eyebrow">Chats</p>
            <p className="muted-copy">
              Branches keep earlier context but only show new messages here.
            </p>
          </div>

          <div className="chat-history-list">
            {rootChats.map((chat) => (
              <SidebarChatNode
                key={chat.id}
                chat={chat}
                chats={workspace.chats}
                activeChatId={workspace.activeChatId}
                onSelectChat={selectChat}
                onDeleteChat={deleteChat}
                onToggleCollapse={toggleChatCollapse}
                collapsedChatIds={collapsedChatIds}
                isCollapsed={Boolean(collapsedChatIds[chat.id])}
                isDeleteDisabled={isSending && chat.id === workspace.activeChatId}
              />
            ))}
          </div>
        </div>
      </aside>

      <section className="chat-shell">
        <header className="chat-header">
          <div>
            <p className="eyebrow">{isBranchChat ? "Branch chat" : "Simple chat"}</p>
            <h1>{activeChat?.title || "New chat"}</h1>
            <p className="muted-copy">
              {isBranchChat
                ? "This branch inherits earlier context silently and only shows new messages."
                : "Start a branch from the composer when you want to continue from this context elsewhere."}
            </p>
          </div>

          {!isBranchChat ? (
            <button
              type="button"
              className="ghost-button"
              onClick={() => setIsTreeOpen((currentValue) => !currentValue)}
              disabled={childChats.length === 0}
            >
              {isTreeOpen ? "Hide branches" : "View branches"}
            </button>
          ) : null}
        </header>

        {!isBranchChat && isTreeOpen ? (
          <section className="tree-panel">
            <div className="tree-panel-header">
              <p className="eyebrow">Branch tree</p>
              <p className="muted-copy">
                Root chat at the top, with every branch nested under its parent.
              </p>
            </div>

            <div className="tree-canvas">
              <BranchTreeNode
                chat={activeChat}
                chats={workspace.chats}
                activeChatId={workspace.activeChatId}
                onSelectChat={selectChat}
              />
            </div>
          </section>
        ) : null}

        <div className="message-stage">
          {messages.length > 0 ? (
            <div className="message-list">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`message-card message-${message.role}`}
                >
                  <MessageBody message={message} />
                </article>
              ))}
              {isSending ? (
                <div className="message-card message-assistant message-pending">
                  <p className="message-plain">Thinking...</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-kicker">Ready when you are</p>
              <h2>Type a question and the assistant will respond here.</h2>
              <p className="muted-copy">
                {isBranchChat
                  ? "This branch already knows the previous chat, but that earlier context stays hidden."
                  : "Create a branch to continue this context in a separate chat."}
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {errorMessage ? (
          <p className="error-banner" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <form
          className="composer-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <div className="composer-card">
            <label className="sr-only" htmlFor="chat-draft">
              Message
            </label>
            <textarea
              id="chat-draft"
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              className="composer-input"
              placeholder="Ask anything..."
              rows={1}
            />
            <div className="composer-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  void createBranch();
                }}
                disabled={isSending}
              >
                New branch
              </button>
              <button
                type="submit"
                className="send-button"
                disabled={isSending}
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}

export default ChatApp;
