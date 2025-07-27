import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import handler from "./api/login.js";
import submitAnnotationHandler from "./api/submit_annotation.js";

dotenv.config({ path: ".env.local" });

const app = express();
app.use(cors());
app.use(express.json());

// Wrapper to adapt Express types to Vercel types
const wrapHandler =
  (handler: any) => (req: express.Request, res: express.Response) => {
    const vercelReq = {
      method: req.method,
      query: req.query,
      cookies: req.cookies || {},
      body: req.body,
    } as any;

    const vercelRes = {
      setHeader: res.setHeader.bind(res),
      status: (code: number) => ({
        json: (data: any) => res.status(code).json(data),
        end: (data?: string) => res.status(code).end(data),
      }),
      end: (data?: string) => res.end(data),
    } as any;

    return handler(vercelReq, vercelRes);
  };

app.post("/api/login", wrapHandler(handler));

app.post("/api/submit_annotation", wrapHandler(submitAnnotationHandler));
app.options("/api/submit_annotation", wrapHandler(submitAnnotationHandler)); // support OPTIONS

// Optionally support /api/register if needed:
// import registerHandler from "./api/register";
// app.post("/api/register", wrapHandler(registerHandler));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Local API server listening on http://localhost:${PORT}`);
});
