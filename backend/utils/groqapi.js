import Groq from "groq-sdk"
import "dotenv/config"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let convs = [];

export async function chatwithgroq(query) {
  const userMessage = {
    role: "user",
    content: query,
  };

  convs.push(userMessage);

  const chatCompletion = await getGroqChatCompletion(convs);
  const reply = chatCompletion.choices[0]?.message?.content || "";

  convs.push({
    role: "assistant",
    content: reply,
  });

  return reply;
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
  });
}

export default {getGroqChatCompletion,chatwithgroq};