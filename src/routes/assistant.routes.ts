import { Router } from "express";
import { callAssistant } from "../controllers/assistant.controller.ts";

export const assistantRouter = Router();

assistantRouter.post("/", callAssistant);
