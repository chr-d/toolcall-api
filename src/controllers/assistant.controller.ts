import type { RequestHandler } from "express";
import { z } from "zod";
import { askAssistant } from "../assistant/assistant.ts";

const requestBodySchema = z.object({
  message: z.string().trim().min(1, "Message must not be empty"),
});

export const callAssistant: RequestHandler = async (req, res) => {
  const result = requestBodySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: result.error.issues,
    });
    return;
  }

  res.json({ reply: await askAssistant(result.data.message) });
};
