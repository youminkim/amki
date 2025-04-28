"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AmkiPair, AmkiState, selectNextPairs } from "@/lib/review";
import { pushAmkiHistory } from "@/lib/amkiStorage";

// Define types for our data structures
interface ReviewHistory {
  cardId: string;
  nextReviewTime: number;
  reviewCount: number;
  lastDifficulty: "again" | "good" | "easy";
}

export default function ReviewPage() {
  const router = useRouter();
  const [amkiPairs, setAmkiPairs] = useState<AmkiPair[]>([]);
  const [reviewHistory, setReviewHistory] = useState<
    Record<string, ReviewHistory>
  >({});
  const [currentCard, setCurrentCard] = useState<AmkiPair | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load data from localStorage
  useEffect(() => {
    try {
      const savedPairs = localStorage.getItem("amkiItems");

      if (savedPairs) {
        setAmkiPairs(JSON.parse(savedPairs));
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
      setIsLoading(false);
    }
  }, []);

  // Select the next card to review
  const selectedPairs = useCallback(() => {
    return selectNextPairs(amkiPairs);
  }, [amkiPairs]);

  // Load the next card when needed
  useEffect(() => {
    if (!isLoading && !currentCard) {
      setCurrentCard(selectedPairs()[0]);
      setShowAnswer(false);
    }
  }, [isLoading, currentCard, selectedPairs]);

  // Handle difficulty rating and move to next card
  const handleDifficultyRating = (state: AmkiState) => {
    if (!currentCard) return;

    // Update history
    pushAmkiHistory(currentCard.id, state);

    // Immediately select and show next card
    const nextPairs = selectNextPairs(amkiPairs);
    setCurrentCard(nextPairs[0] || null);
    setShowAnswer(false);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentCard) return;

      if (!showAnswer) {
        // Any key shows the answer when it's hidden
        setShowAnswer(true);
        return;
      }

      // Number keys for difficulty ratings
      switch (e.key) {
        case "1": // easy
          handleDifficultyRating(AmkiState.Stable);
          break;
        case "2": // good
          handleDifficultyRating(AmkiState.Retrieve);
          break;
        case "3": // again
          handleDifficultyRating(AmkiState.Difficult);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, showAnswer, amkiPairs]);

  // Handle card click to show answer
  const handleCardClick = () => {
    if (!showAnswer) {
      setShowAnswer(true);
    }
  };

  // Go back to home page
  const goBack = () => {
    router.push("/");
  };

  return (
    <div className="h-[80vh] flex flex-col p-4 bg-black text-white overflow-hidden">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p>Loading flashcards...</p>
        </div>
      ) : !currentCard ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-center mb-4 text-xl font-bold">
            🎉 All caught up!
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={containerRef}
            className="flex-1 flex flex-col border border-gray-800 rounded-lg overflow-hidden cursor-pointer bg-gray-900"
            onClick={handleCardClick}
          >
            <div className="flex-1 p-4 flex flex-col overflow-y-auto">
              <div className="flex-1 flex items-center justify-center min-h-[40%]">
                <p className="text-xl text-center break-words px-4">
                  {currentCard.question}
                </p>
              </div>

              <hr className="my-4 border-gray-800" />
              <div className="flex-1 flex items-center justify-center min-h-[40%]">
                <p className="text-xl break-words px-4">
                  {showAnswer && currentCard.answer}
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 p-4 bg-gray-800 border-t border-gray-700">
              {showAnswer ? (
                <div className="flex gap-2 mt-1">
                  <Button
                    onClick={() => handleDifficultyRating(AmkiState.Difficult)}
                    variant="outline"
                    className="flex-1 bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                  >
                    Again (1)
                  </Button>
                  <Button
                    onClick={() => handleDifficultyRating(AmkiState.Retrieve)}
                    variant="outline"
                    className="flex-1 bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                  >
                    Good (2)
                  </Button>
                  <Button
                    onClick={() => handleDifficultyRating(AmkiState.Stable)}
                    variant="outline"
                    className="flex-1 bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                  >
                    Easy (3)
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  <Button
                    onClick={() => handleDifficultyRating(AmkiState.Stable)}
                    variant="outline"
                    className="flex-1 bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                  >
                    Flip
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
