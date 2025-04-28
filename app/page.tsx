"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { getAmkiCount } from "@/lib/amkiStorage";
import { BookOpen, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Define the type for an Amki set
interface AmkiSet {
  id: string;
  question: string;
  answer: string;
  createdAt: number;
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [amkiSets, setAmkiSets] = useState<AmkiSet[]>([]);
  const [amkiCount, setAmkiCount] = useState(0);

  // Load Amki sets from localStorage on component mount
  useEffect(() => {
    try {
      const savedSets = localStorage.getItem("amkiSets");
      if (savedSets) {
        setAmkiSets(JSON.parse(savedSets));
        setAmkiCount(JSON.parse(savedSets).length);
      }
    } catch (error) {
      console.error("Error loading Amki sets from localStorage:", error);
    }
  }, []);

  // Handle text from camera page
  useEffect(() => {
    const text = searchParams.get("text");
    if (text) {
      setQuestion(decodeURIComponent(text));
      // Clear the URL parameter
      router.replace("/");
    }
  }, [searchParams, router]);

  useEffect(() => {
    setAmkiCount(getAmkiCount());
  }, []);

  const handleAddAmki = (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim() || !answer.trim()) return;

    // Create a new Amki set
    const newSet: AmkiSet = {
      id: crypto.randomUUID(),
      question: question.trim(),
      answer: answer.trim(),
      createdAt: Date.now(),
    };

    // Add the new set to the existing sets
    const updatedSets = [...amkiSets, newSet];

    // Save to state and localStorage
    setAmkiSets(updatedSets);
    setAmkiCount(updatedSets.length);
    try {
      localStorage.setItem("amkiSets", JSON.stringify(updatedSets));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }

    // Clear the form
    setQuestion("");
    setAnswer("");
  };

  const goToReview = () => {
    router.push("/review");
  };

  const goToAdd = () => {
    router.push("/add");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">
        {amkiCount ? amkiCount + " Amki" : "Amki"}
      </h1>
      <div className="text-center">
        <div className="flex gap-4">
          <Button
            className="flex flex-col items-center justify-center w-32 h-32 bg-gray-800 hover:bg-gray-700 text-white"
            onClick={goToAdd}
          >
            <Plus className="h-16 w-16" />
            <span className="mt-2 text-lg">Add</span>
          </Button>
          <Button
            className="flex flex-col items-center justify-center w-32 h-32 bg-gray-800 hover:bg-gray-700 text-white"
            onClick={goToReview}
          >
            <BookOpen className="h-16 w-16" />
            <span className="mt-2 text-lg">Review</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
