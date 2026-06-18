import { formatPreview, getChildChats } from "../utils";

function BranchTreeNode({
  chat,
  chats,
  activeChatId,
  onSelectChat,
  depth = 0,
}) {
  const childChats = getChildChats(chats, chat.id);

  return (
    <div className="tree-node-wrap">
      <div
        className={`tree-node-card ${
          chat.id === activeChatId ? "tree-node-card-active" : ""
        }`}
        style={{ "--tree-depth": depth }}
      >
        <button
          type="button"
          className="tree-node-open"
          onClick={() => onSelectChat(chat.id)}
        >
          <span className="tree-node-title">{chat.title}</span>
          <span className="tree-node-preview">{formatPreview(chat)}</span>
        </button>
      </div>

      {childChats.length > 0 ? (
        <div className="tree-children">
          {childChats.map((childChat) => (
            <BranchTreeNode
              key={childChat.id}
              chat={childChat}
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={onSelectChat}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default BranchTreeNode;
