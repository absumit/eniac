import {
  LEGACY_BRANCH_STORAGE_KEY,
  LEGACY_MESSAGES_STORAGE_KEY,
  LEGACY_WORKSPACE_STORAGE_KEY,
  SIDEBAR_UI_STORAGE_KEY,
  STORAGE_KEY,
} from "./constants";
import {
  createChat,
  deriveChatTitle,
  getLegacyTimeline,
  normalizeStoredMessage,
  normalizeWorkspace,
} from "./utils";

export function loadWorkspace() {
  if (typeof window === "undefined") {
    return normalizeWorkspace();
  }

  try {
    const rawWorkspace = window.localStorage.getItem(STORAGE_KEY);

    if (!rawWorkspace) {
      return migrateLegacyWorkspace();
    }

    return normalizeWorkspace(JSON.parse(rawWorkspace));
  } catch {
    return migrateLegacyWorkspace();
  }
}

export function persistWorkspace(workspace) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}

export function loadSidebarUi() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawSidebarUi = window.localStorage.getItem(SIDEBAR_UI_STORAGE_KEY);

    if (!rawSidebarUi) {
      return {};
    }

    const parsedSidebarUi = JSON.parse(rawSidebarUi);
    return parsedSidebarUi && typeof parsedSidebarUi === "object"
      ? parsedSidebarUi
      : {};
  } catch {
    return {};
  }
}

export function persistSidebarUi(sidebarUi) {
  window.localStorage.setItem(SIDEBAR_UI_STORAGE_KEY, JSON.stringify(sidebarUi));
}

function migrateLegacyWorkspace() {
  if (typeof window === "undefined") {
    return normalizeWorkspace();
  }

  try {
    const rawWorkspace = window.localStorage.getItem(
      LEGACY_WORKSPACE_STORAGE_KEY,
    );

    if (rawWorkspace) {
      return normalizeWorkspace(JSON.parse(rawWorkspace));
    }
  } catch {
    // Ignore malformed v2 workspace storage and continue to older migrations.
  }

  try {
    const rawMessages = window.localStorage.getItem(LEGACY_MESSAGES_STORAGE_KEY);

    if (rawMessages) {
      const parsedMessages = JSON.parse(rawMessages);

      if (Array.isArray(parsedMessages)) {
        const localMessages = parsedMessages
          .map(normalizeStoredMessage)
          .filter(Boolean);
        const initialChat = createChat({
          localMessages,
          title: deriveChatTitle(localMessages),
        });

        window.localStorage.removeItem(LEGACY_MESSAGES_STORAGE_KEY);
        return normalizeWorkspace({
          activeChatId: initialChat.id,
          chats: [initialChat],
        });
      }
    }
  } catch {
    // Ignore malformed legacy chat storage and continue to branch migration.
  }

  try {
    const rawWorkspace = window.localStorage.getItem(LEGACY_BRANCH_STORAGE_KEY);

    if (!rawWorkspace) {
      return normalizeWorkspace();
    }

    const workspace = JSON.parse(rawWorkspace);
    const branches =
      workspace?.branches && typeof workspace.branches === "object"
        ? workspace.branches
        : {};
    const activeBranchId =
      typeof workspace?.activeBranchId === "string" &&
      branches[workspace.activeBranchId]
        ? workspace.activeBranchId
        : "main";
    const localMessages = getLegacyTimeline(activeBranchId, branches)
      .map(normalizeStoredMessage)
      .filter(Boolean);
    const initialChat = createChat({
      localMessages,
      title: deriveChatTitle(localMessages),
    });

    window.localStorage.removeItem(LEGACY_BRANCH_STORAGE_KEY);
    return normalizeWorkspace({
      activeChatId: initialChat.id,
      chats: [initialChat],
    });
  } catch {
    return normalizeWorkspace();
  }
}
