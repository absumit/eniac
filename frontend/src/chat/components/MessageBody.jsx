import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MessageBody({ message }) {
  const safeContent =
    typeof message?.content === "string"
      ? message.content
      : String(message?.content ?? "");

  if (message.role === "assistant") {
    return (
      <div className="message-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{safeContent}</ReactMarkdown>
      </div>
    );
  }

  return <p className="message-plain">{safeContent}</p>;
}

export default MessageBody;
