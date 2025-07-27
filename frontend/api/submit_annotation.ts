import { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI_LOCAL;
if (!uri) {
  throw new Error("Missing MONGODB_URI_LOCAL environment variable");
}

const client = new MongoClient(uri);

interface DocumentSchema {
  id: number;
  src: string;
  mt: string;
  ref: string;
  annotations: Record<string, {
    annotatedSpans: Array<{
      error_text_segment: string;
      start_index: number;
      end_index: number;
      error_type: string;
      error_severity: string;
    }>;
    overall_translation_score: number;
    corrected_sentence: string;
    qaActions: any[];
  }>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow requests from any origin
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); // Allowed HTTP methods
  res.setHeader("Access-Control-Allow-Headers", "Content-Type"); // Allowed headers

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  console.log("Connecting to MongoDB at:", uri);

  const {
    dataset, id, annotationKey, 
    action, span, originalSpan, newSpan, // for qa actions
    annotatedSpans, overall_translation_score, corrected_sentence // for annotation actions
  } = req.body;

  if (!dataset || !id || !annotationKey) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  await client.connect();
  const db = client.db("annotations");
  const col = db.collection<DocumentSchema>(dataset);
  const documentId = ObjectId.createFromHexString(id);
  const fieldRoot = `annotations.${annotationKey}`;

  // 1) Annotation submission 
  if (!action) {
    const updateDoc = {
      $set: {
        [fieldRoot]: {
          annotatedSpans: annotatedSpans || [],
          overall_translation_score,
          corrected_sentence,
          qaActions: []
        }
      }
    };

    const result = await col.updateOne(
      { _id: documentId },
      updateDoc
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Document not found or nothing changed" });
    }
    return res.status(200).json({ message: "Annotation submitted successfully" });
  }

  // 2) QA submission
  const filter = {
    _id: documentId,
    [fieldRoot]: { $exists: true }
  };

  const qaEntry: any = {
    qaUser: annotationKey.replace("_annotations", ""),
    action,
    timestamp: new Date()
  };

  if (action === "add" || action === "delete") {
    qaEntry.span = span;
  } else if (action === "modify") {
    qaEntry.originalSpan = originalSpan;
    qaEntry.newSpan = newSpan;
  }

  const updateDoc = {
    $push: {
      [`${fieldRoot}.qaActions`]: qaEntry
    }
  };

  const result = await col.updateOne(filter, updateDoc);

  if (result.modifiedCount === 0) {
    return res.status(404).json({ error: "Document not found or nothing changed" });
  }
  return res.status(200).json({ message: "QA action recorded" });
}
