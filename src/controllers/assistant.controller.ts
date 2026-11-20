import type { RequestHandler } from "express";

export const callAssistant: RequestHandler = async (req, res) => {
  res.json({ message: "Hello World" });
};
