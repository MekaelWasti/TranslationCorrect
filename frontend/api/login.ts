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
                const dataset = await db.collection('annotation-tool-dataset').find({}).toArray();
                return res.status(200).json({ message: "Login successful", dataset }); // Return the dataset if the user is authenticated successfully
            }
            else {
                return res.status(401).json({ error: "Incorrect password" });
            }
        }
        else {
            // Registration
            await annotators_collection.insertOne({ username, password, createdAt: new Date(), });

            return res.status(201).json({ message: "Registration successful" });
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