export function generateId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createMessage(role, content) {
  return {
    id: generateId(),
    role,
    content,
  };
}

export function normalizeStoredMessage(message) {
  if (
    typeof message?.role !== "string" ||
    typeof message?.content !== "string"
  ) {
    return null;
  }

  return {
    id: typeof message?.id === "string" ? message.id : generateId(),
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  };
}

export function deriveChatTitle(messages, fallbackTitle = "New chat") {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const source = firstUserMessage?.content?.trim();

  if (!source) {
    return fallbackTitle;
  }

  return source.length > 36 ? `${source.slice(0, 33).trim()}...` : source;
}

export function createChat({
  title = "New chat",
  contextMessages = [],
  localMessages = [],
  parentChatId = null,
} = {}) {
  const now = new Date().toISOString();

  return {
    id: generateId(),
    title,
    contextMessages,
    localMessages,
    parentChatId,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeChat(chat) {
  const contextMessages = Array.isArray(chat?.contextMessages)
    ? chat.contextMessages.map(normalizeStoredMessage).filter(Boolean)
    : [];
  const localMessages = Array.isArray(chat?.localMessages)
    ? chat.localMessages.map(normalizeStoredMessage).filter(Boolean)
    : Array.isArray(chat?.messages)
      ? chat.messages.map(normalizeStoredMessage).filter(Boolean)
      : [];

  return {
    id: typeof chat?.id === "string" ? chat.id : generateId(),
    title:
      typeof chat?.title === "string" && chat.title.trim()
        ? chat.title
        : deriveChatTitle(localMessages),
    contextMessages,
    localMessages,
    parentChatId:
      typeof chat?.parentChatId === "string" ? chat.parentChatId : null,
    createdAt:
      typeof chat?.createdAt === "string"
        ? chat.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof chat?.updatedAt === "string"
        ? chat.updatedAt
        : new Date().toISOString(),
  };
}

export function normalizeWorkspace(workspace) {
  const chats = Array.isArray(workspace?.chats)
    ? workspace.chats.map(normalizeChat)
    : [];
  const fallbackChat = createChat();
  const safeChats = chats.length > 0 ? chats : [fallbackChat];
  const activeChatId =
    typeof workspace?.activeChatId === "string" &&
    safeChats.some((chat) => chat.id === workspace.activeChatId)
      ? workspace.activeChatId
      : safeChats[0].id;

  return {
    activeChatId,
    chats: safeChats,
  };
}

export function getLegacyTimeline(branchId, branches) {
  const branch = branches?.[branchId];

  if (!branch) {
    return [];
  }

  const localMessages = Array.isArray(branch.localMessages)
    ? branch.localMessages
    : Array.isArray(branch.messages)
      ? branch.messages
      : [];

  if (!branch.parentBranchId) {
    return localMessages;
  }

  const parentTimeline = getLegacyTimeline(branch.parentBranchId, branches);
  const forkIndex = parentTimeline.findIndex(
    (message) => message?.id === branch.forkMessageId,
  );
  const inheritedMessages =
    forkIndex === -1 ? parentTimeline : parentTimeline.slice(0, forkIndex + 1);

  return [...inheritedMessages, ...localMessages];
}

export function getChatContext(chat) {
  return [...(chat?.contextMessages ?? []), ...(chat?.localMessages ?? [])];
}

export function formatPreview(chat) {
  const lastVisibleMessage = chat.localMessages.at(-1)?.content?.trim();

  if (lastVisibleMessage) {
    return lastVisibleMessage.length > 56
      ? `${lastVisibleMessage.slice(0, 53).trim()}...`
      : lastVisibleMessage;
  }

  return chat.contextMessages.length > 0
    ? "Inherited context from previous chat"
    : "No messages yet";
}

export function getChildChats(chats, parentChatId) {
  return chats.filter((chat) => chat.parentChatId === parentChatId);
}

export function getRootChats(chats) {
  return chats.filter((chat) => !chat.parentChatId);
}

export function collectChatSubtreeIds(chats, chatId) {
  const childChats = getChildChats(chats, chatId);

  return [
    chatId,
    ...childChats.flatMap((childChat) =>
      collectChatSubtreeIds(chats, childChat.id),
    ),
  ];
}

export function getChatById(chats, chatId) {
  return chats.find((chat) => chat.id === chatId) ?? null;
}

export function getAncestorChatIds(chats, chatId) {
  const ancestorIds = [];
  let currentChat = getChatById(chats, chatId);

  while (currentChat?.parentChatId) {
    ancestorIds.push(currentChat.parentChatId);
    currentChat = getChatById(chats, currentChat.parentChatId);
  }

  return ancestorIds;
}
