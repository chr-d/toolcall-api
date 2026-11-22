import type { RequestHandler } from "express";
import { z } from "zod";
import { askAssistant } from "../assistant/assistant.ts";

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2_000),
});

const requestBodySchema = z.object({
  message: z.string().trim().min(1, "Message must not be empty"),
  history: z.array(historyMessageSchema).max(10).optional(),
});

export const callAssistant: RequestHandler = async (req, res) => {
  const { message, history } = requestBodySchema.parse(req.body);
  res.json({ reply: await askAssistant(message, history) });
};
