import Anthropic from "@anthropic-ai/sdk";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { IncompleteReplyError } from "../assistant/assistant.ts";

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof Anthropic.RateLimitError) {
    console.error(err);
    const retryAfter = err.headers?.get("retry-after");
    if (retryAfter) res.setHeader("Retry-After", retryAfter);
    res
      .status(503)
      .json({ error: "The service is busy. Please try again shortly." });
    return;
  }

  if (err instanceof Anthropic.AnthropicError) {
    console.error(err);
    res
      .status(502)
      .json({ error: "The AI service could not complete this request." });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request body", details: err.issues });
    return;
  }

  if (err?.type === "entity.parse.failed" && err.status === 400) {
    res.status(400).json({ error: "Malformed JSON" });
    return;
  }

  if (err instanceof IncompleteReplyError) {
    console.error(err);
    res
      .status(502)
      .json({ error: "The assistant stopped before it could finish its reply." });
    return;
  }

  if (
    err?.expose === true &&
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status < 500
  ) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};
