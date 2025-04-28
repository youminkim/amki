"use client";

import { Button } from "@/components/ui/button";
import { resetAmkiItems } from "@/lib/amkiStorage";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to reset all flashcards? This cannot be undone."
      )
    ) {
      resetAmkiItems();
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen p-4 bg-black text-white">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="space-y-4">
          <div className="p-4 border border-gray-800 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Danger Zone</h2>
            <p className="text-gray-400 mb-4">
              This will delete all your flashcards and review history.
            </p>
            <Button
              onClick={handleReset}
              variant="destructive"
              className="w-full"
            >
              Reset All Flashcards
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
