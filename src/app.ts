import express from "express";
import { assistantRouter } from "./routes/assistant.routes.ts";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

app.use("/assistant", assistantRouter);

app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
