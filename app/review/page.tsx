"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

// Define types for our data structures
interface AmkiSet {
  id: string
  question: string
  answer: string
  createdAt: number
}

interface ReviewHistory {
  cardId: string
  nextReviewTime: number
  reviewCount: number
  lastDifficulty: "again" | "good" | "easy"
}

export default function ReviewPage() {
  const router = useRouter()
  const [amkiSets, setAmkiSets] = useState<AmkiSet[]>([])
  const [reviewHistory, setReviewHistory] = useState<Record<string, ReviewHistory>>({})
  const [currentCard, setCurrentCard] = useState<AmkiSet | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load data from localStorage
  useEffect(() => {
    try {
      const savedSets = localStorage.getItem("amkiSets")
      const savedHistory = localStorage.getItem("amkiReviewHistory")

      if (savedSets) {
        setAmkiSets(JSON.parse(savedSets))
      }

      if (savedHistory) {
        setReviewHistory(JSON.parse(savedHistory))
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error loading data from localStorage:", error)
      setIsLoading(false)
    }
  }, [])

  // Select the next card to review
  const selectNextCard = useCallback(() => {
    if (amkiSets.length === 0) return null

    const now = Date.now()
    const availableCards = amkiSets.filter((card) => {
      const history = reviewHistory[card.id]
      return !history || history.nextReviewTime <= now
    })

    if (availableCards.length === 0) {
      return null // No cards due for review
    }

    // Sort by priority (cards with "again" first, then by next review time)
    availableCards.sort((a, b) => {
      const historyA = reviewHistory[a.id]
      const historyB = reviewHistory[b.id]

      // New cards (no history) come after cards with history
      if (!historyA && historyB) return 1
      if (historyA && !historyB) return -1
      if (!historyA && !historyB) return 0

      // Cards marked "again" come first
      if (historyA.lastDifficulty === "again" && historyB.lastDifficulty !== "again") return -1
      if (historyA.lastDifficulty !== "again" && historyB.lastDifficulty === "again") return 1

      // Otherwise sort by next review time
      return historyA.nextReviewTime - historyB.nextReviewTime
    })

    return availableCards[0]
  }, [amkiSets, reviewHistory])

  // Load the next card when needed
  useEffect(() => {
    if (!isLoading && !currentCard) {
      const nextCard = selectNextCard()
      setCurrentCard(nextCard)
      setShowAnswer(false)
    }
  }, [isLoading, currentCard, selectNextCard])

  // Calculate next review time based on difficulty
  const calculateNextReviewTime = (difficulty: "again" | "good" | "easy", reviewCount: number) => {
    const now = Date.now()

    switch (difficulty) {
      case "again":
        return now + 1 * 60 * 1000 // 1 minute
      case "good":
        return now + 10 * 60 * 1000 // 10 minutes
      case "easy":
        return now + 24 * 60 * 60 * 1000 // 1 day
      default:
        return now + 10 * 60 * 1000 // Default to 10 minutes
    }
  }

  // Handle difficulty rating
  const handleDifficultyRating = (difficulty: "again" | "good" | "easy") => {
    if (!currentCard) return

    const cardId = currentCard.id
    const existingHistory = reviewHistory[cardId] || {
      cardId,
      nextReviewTime: 0,
      reviewCount: 0,
      lastDifficulty: "good",
    }

    const updatedHistory: ReviewHistory = {
      ...existingHistory,
      reviewCount: existingHistory.reviewCount + 1,
      nextReviewTime: calculateNextReviewTime(difficulty, existingHistory.reviewCount + 1),
      lastDifficulty: difficulty,
    }

    const newHistory = {
      ...reviewHistory,
      [cardId]: updatedHistory,
    }

    // Save to state and localStorage
    setReviewHistory(newHistory)
    try {
      localStorage.setItem("amkiReviewHistory", JSON.stringify(newHistory))
    } catch (error) {
      console.error("Error saving review history:", error)
    }

    // Move to next card
    setCurrentCard(null)
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentCard) return

      if (!showAnswer) {
        // Any key shows the answer when it's hidden
        setShowAnswer(true)
        return
      }

      // Number keys for difficulty ratings
      switch (e.key) {
        case "1":
          handleDifficultyRating("again")
          break
        case "2":
          handleDifficultyRating("good")
          break
        case "3":
          handleDifficultyRating("easy")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentCard, showAnswer])

  // Handle card click to show answer
  const handleCardClick = () => {
    if (!showAnswer) {
      setShowAnswer(true)
    }
  }

  // Go back to home page
  const goBack = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-md mx-auto">
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="sm" onClick={goBack} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-lg font-medium">Review Flashcards</h1>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p>Loading flashcards...</p>
        </div>
      ) : !currentCard ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-center mb-4">No cards due for review!</p>
          <Button onClick={goBack}>Return to Home</Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div
            ref={containerRef}
            className="flex-1 flex flex-col border rounded-lg shadow-sm overflow-hidden cursor-pointer"
            onClick={handleCardClick}
          >
            <div className="flex-1 p-6 flex flex-col">
              <div className="flex-1 flex items-center justify-center mb-4">
                <p className="text-xl text-center">{currentCard.question}</p>
              </div>

              {showAnswer && (
                <>
                  <hr className="my-4" />
                  <div className="flex-1 flex items-start justify-center">
                    <p className="text-lg">{currentCard.answer}</p>
                  </div>
                </>
              )}
            </div>

            {showAnswer && (
              <div className="p-4 bg-gray-50 border-t">
                <div className="flex justify-between">
                  <div className="text-xs text-gray-500 flex items-center justify-center w-full">
                    <span className="mr-4">&lt;1m</span>
                    <span className="mr-4">&lt;10m</span>
                    <span>1d</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  <Button onClick={() => handleDifficultyRating("again")} variant="outline" className="flex-1">
                    Again (1)
                  </Button>
                  <Button onClick={() => handleDifficultyRating("good")} variant="outline" className="flex-1">
                    Good (2)
                  </Button>
                  <Button onClick={() => handleDifficultyRating("easy")} variant="outline" className="flex-1">
                    Easy (3)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
