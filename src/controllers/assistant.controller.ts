import type { RequestHandler } from "express";
import { askAssistant } from "../assistant/assistant.ts";

export const callAssistant: RequestHandler = async (req, res) => {
  res.json({ reply: await askAssistant(req.body.message) });
};
