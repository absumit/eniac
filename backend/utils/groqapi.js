import "dotenv/config";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => {
      return (
        typeof message?.role === "string" &&
        typeof message?.content === "string" &&
        message.content.trim().length > 0
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export async function chatwithgroq(input) {
  const messages = Array.isArray(input)
    ? sanitizeMessages(input)
    : sanitizeMessages([
        {
          role: "user",
          content: input || "hi",
        },
      ]);

  if (messages.length === 0) {
    messages.push({
      role: "user",
      content: "hi",
    });
  }

  const chatCompletion = await getGroqChatCompletion(messages);
  return chatCompletion.choices[0]?.message?.content || "";
}

export async function getGroqChatCompletion(messages) {
  return groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "you are ai answering ques",
      },
      ...messages,
    ],
    model: "openai/gpt-oss-20b",
    temperature: 0.7,
    max_tokens: 512,
  });
}

export default { getGroqChatCompletion, chatwithgroq };
