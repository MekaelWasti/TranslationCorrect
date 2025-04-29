import { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!; // Ensure this is set in the environment
const client = new MongoClient(uri);

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
    const annotators_collection = db.collection('annotators');

    if (req.method == "POST") {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Missing username or password" });
        }

    try {
        const user = await annotators_collection.findOne({ username });

        // Login
        if (user) {
            if (user.password === password) {
                const mandarin_dataset = await db.collection('annotation-tool-dataset').find({}).toArray();
                const cantonese_dataset = await db.collection('annotation-tool-cantonese').find({}).toArray();
                const japanese_dataset = await db.collection('annotation-tool-japanese').find({}).toArray();
                const mandarin_v2_dataset = await db.collection('annotation-tool-mandarin-v2').find({}).toArray();
                const bengali_dataset = await db.collection('annotation-tool-bengali').find({}).toArray();
                const cantonese_v2_dataset = await db.collection('annotation-tool-cantonese-v2').find({}).toArray();
                const french_dataset = await db.collection('annotation-tool-french').find({}).toArray();
                const tamil_dataset = await db.collection('annotation-tool-tamil').find({}).toArray();
                const shanghainese_dataset = await db.collection('annotation-tool-shanghainese').find({}).toArray();
                return res.status(200).json({ message: "Login successful", mandarin_dataset, cantonese_dataset, japanese_dataset, mandarin_v2_dataset, bengali_dataset, cantonese_v2_dataset, french_dataset, tamil_dataset, shanghainese_dataset }); // Return the dataset if the user is authenticated successfully
            }
            else {
                return res.status(401).json({ error: "Incorrect password" });
            }
        }
        else {
            return res.status(401).json({ error: "User not found. Please enter a valid username or register." });
        }
    }
    catch (error) {
        console.error("Error handling authentication", error);
        res.status(500).json({ error: "Internal Server Error", details: error });
    }
    }

    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}