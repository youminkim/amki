import { z } from "zod";

export const FlashcardPair = z.object({
  question: z.string(),
  answer: z.string(),
});

export const FlashcardResponse = z.object({
  pairs: z.array(FlashcardPair),
});

/** Extra info about the learner (age, goals, etc.). */
export interface FlashcardContext {
  age?: number;
  goals?: string[];
  [key: string]: unknown;
}

export interface PromptParams {
  context?: string;
  text: string;
}
