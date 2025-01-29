import { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri)


interface Annotation {
  username: string;
  annotation: string;
  createdAt: Date;
}

interface DocumentSchema {
  id: number;
  src: string;
  mt: string;
  ref: string;
  annotations: Annotation[];
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

  
  
  const db = client.db('annotations');
  const annotations_collection = db.collection<DocumentSchema>('annotation-tool-dataset');

  if (req.method == "POST") {
    const { id, annotation } = req.body;

    if (!id || !annotation) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      
      const annotationObject = annotation[0];

      if (!annotationObject) {
        return res.status(400).json({ error: "Empty annotation object" });
      }

      const result = await annotations_collection.updateOne(
        { id }, // Match the document by its `id`
        {
          $push: {
            annotations: annotation},
          },
      );

      if (result.modifiedCount > 0) {
        return res.status(200).json({ message: "Annotation submitted successfully" });
      }
      else {
        return res.status(404).json({ error: "Failed to update annotation", });
      }
    }
    catch (error) {
      console.error("Error submitting annotation", error);
      res.status(500).json({ error: "Internal Server Error", details: error });
    }
  }
  res.setHeader("Allow", ["POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
