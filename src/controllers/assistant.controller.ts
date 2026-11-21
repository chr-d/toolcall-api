import type { RequestHandler } from "express";
import { z } from "zod";
import { askAssistant } from "../assistant/assistant.ts";

const requestBodySchema = z.object({
  message: z.string().trim().min(1, "Message must not be empty"),
});

export const callAssistant: RequestHandler = async (req, res) => {
  const { message } = requestBodySchema.parse(req.body);
  res.json({ reply: await askAssistant(message) });
};
