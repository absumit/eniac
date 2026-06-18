import { formatPreview, getChildChats } from "../utils";

function SidebarChatNode({
  chat,
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onToggleCollapse,
  collapsedChatIds,
  isCollapsed,
  isDeleteDisabled,
  depth = 0,
}) {
  const childChats = getChildChats(chats, chat.id);
  const isActive = chat.id === activeChatId;
  const isRootChat = !chat.parentChatId;
  const hasChildren = childChats.length > 0;

  return (
    <div className="sidebar-node-wrap">
      <div
        className={`chat-history-item ${isActive ? "chat-history-item-active" : ""}`}
        style={{ "--sidebar-depth": depth }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="chat-collapse-button"
            onClick={() => onToggleCollapse(chat.id)}
            aria-label={isCollapsed ? `Expand ${chat.title}` : `Collapse ${chat.title}`}
          >
            {isCollapsed ? "+" : "-"}
          </button>
        ) : (
          <span className="chat-collapse-spacer" aria-hidden="true" />
        )}

        <button
          type="button"
          className="chat-history-main"
          onClick={() => onSelectChat(chat.id)}
        >
          <span className="chat-history-meta">
            {isRootChat ? "Main chat" : "Branch"}
          </span>
          <span className="chat-history-title">{chat.title}</span>
          <span className="chat-history-preview">{formatPreview(chat)}</span>
        </button>

        <button
          type="button"
          className="chat-delete-button"
          onClick={() => onDeleteChat(chat.id)}
          aria-label={`Delete ${chat.title}`}
          disabled={isDeleteDisabled}
        >
          Delete
        </button>
      </div>

      {hasChildren && !isCollapsed ? (
        <div className="sidebar-children">
          {childChats.map((childChat) => (
            <SidebarChatNode
              key={childChat.id}
              chat={childChat}
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={onSelectChat}
              onDeleteChat={onDeleteChat}
              onToggleCollapse={onToggleCollapse}
              collapsedChatIds={collapsedChatIds}
              isCollapsed={Boolean(collapsedChatIds[childChat.id])}
              isDeleteDisabled={isDeleteDisabled}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default SidebarChatNode;
