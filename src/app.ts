import express from "express";
import { assistantRouter } from "./routes/assistant.routes.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

app.use("/assistant", assistantRouter);

app.use(errorHandler);

app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
