"use server";

import { ImageAnnotatorClient } from "@google-cloud/vision";

/**
 * Server action to process an image with Google Cloud Vision API for OCR
 */
export async function processImageWithVisionAPI(imageBase64: string) {
    try {
        // Remove the data URL prefix to get just the base64 data
        const base64Data = imageBase64.split(",")[1];

        // Create a new client
        const client = new ImageAnnotatorClient({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(
                    /\\n/g,
                    "\n"
                ),
            },
            projectId: process.env.GOOGLE_PROJECT_ID,
        });

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Data, "base64");

        // Perform text detection
        const [result] = await client.textDetection({
            image: {
                content: imageBuffer,
            },
        });

        const detections = result.textAnnotations;
        if (!detections || detections.length === 0) {
            return {
                success: true,
                text: "",
            };
        }

        // Get the full text from the first annotation (which contains all text)
        const extractedText = detections[0].description || "";

        return {
            success: true,
            text: extractedText,
        };
    } catch (error) {
        console.error("Error processing image with Vision API:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
        };
    }
}
