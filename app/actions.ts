"use server";

import { FlashcardResponse, PromptParams } from "@/lib/types";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";

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
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function generateFlashcards(params: PromptParams) {
  const openai = new OpenAI({
    // baseURL: "https://api.keywordsai.co/api/",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.responses.parse({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "You are a flash-card generator. Follow the instructions precisely and return valid JSON.",
      },
      {
        role: "user",
        content: `
You are a flash-card generator.

INSTRUCTIONS
1. Read CONTEXT (about the learner) and TEXT (the source).
2. Identify facts that lend themselves to question–answer flashcards.
3. Produce up to 12 pairs.
   • Each question must be short, clear, and answerable only from the TEXT.  
   • Each answer must be a single sentence or phrase copied or paraphrased from the TEXT.  
4. If no valid pairs exist, return an empty array.
5. Short but core concept flashcards are best.

CONTEXT
${params.context}

TEXT
${params.text}
`.trim(),
      },
    ],
    text: {
      format: zodTextFormat(FlashcardResponse, "paris"),
    },
  });

  console.log(response.output_parsed);

  if (!response.output_parsed) {
    throw new Error("No valid response from AI");
  }

  return response.output_parsed.pairs;
}
