import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { callAssistant } from "../controllers/assistant.controller.ts";

export const assistantRouter = Router();

const assistantRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 5,
  message: { error: "Too many requests. Please try again shortly." },
});

assistantRouter.post("/", assistantRateLimit, callAssistant);
