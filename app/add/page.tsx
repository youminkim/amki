"use client";

import { Button } from "@/components/ui/button";
import { getAmkiCount, saveAmkiPairs, getAmkiItems } from "@/lib/amkiStorage";
import { Camera, Loader2, Type, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { generateFlashcards, processImageWithVisionAPI } from "../actions";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

export default function AddPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [qaPairs, setQAPairs] = useState<
    Array<{ question: string; answer: string }>
  >([
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);
  const [isTextMode, setIsTextMode] = useState(false);
  const [inputText, setInputText] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [amkiCount, setAmkiCount] = useState(0);

  const openCamera = async () => {
    try {
      // First, close any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Try to get the camera stream with different facing modes
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 720 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
      } catch (error) {
        console.log("Trying user-facing camera as fallback...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
      }

      if (!stream) {
        throw new Error("Could not access any camera");
      }

      streamRef.current = stream;

      if (videoRef.current) {
        // Clear any existing source
        videoRef.current.srcObject = null;

        // Set the new stream
        videoRef.current.srcObject = stream;

        // Ensure the video element is properly sized
        videoRef.current.style.width = "100%";
        videoRef.current.style.height = "100%";
        videoRef.current.style.objectFit = "cover";

        // Wait for the video to be ready
        await new Promise((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not found"));
            return;
          }

          const video = videoRef.current;

          video.onloadedmetadata = () => {
            console.log("Video metadata loaded");
            video
              .play()
              .then(() => {
                console.log("Video started playing");
                resolve(true);
              })
              .catch((error) => {
                console.error("Error playing video:", error);
                reject(error);
              });
          };

          video.onerror = (error) => {
            console.error("Video element error:", error);
            reject(error);
          };

          // Set a timeout in case the video never loads
          setTimeout(() => {
            if (video.readyState === 0) {
              reject(new Error("Video failed to load"));
            }
          }, 5000);
        });
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Error",
        description:
          "Could not access camera. Please ensure you have granted camera permissions and that your camera is working properly.",
        variant: "destructive",
      });
      router.back();
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    router.back();
  };

  const capturePhoto = async () => {
    if (videoRef.current && streamRef.current && !isProcessing) {
      try {
        setIsProcessing(true);
        // Create a canvas element to capture the photo
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        // Draw the current video frame to the canvas
        const context = canvas.getContext("2d");
        if (context) {
          // Draw the image in its original orientation (reversed)
          context.drawImage(
            videoRef.current,
            0,
            0,
            canvas.width,
            canvas.height
          );

          // Convert canvas to blob
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("Failed to create blob from canvas"));
                }
              },
              "image/jpeg",
              0.95
            );
          });

          // Convert blob to base64
          const reader = new FileReader();
          const imageData = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result);
              } else {
                reject(new Error("Failed to read blob as base64"));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // Set the captured image
          setCapturedImage(imageData);

          // Process the image immediately
          const result = await processImageWithVisionAPI(imageData);
          if (result.success && result.text) {
            // Process the text with AI to get question-answer pairs
            const aiResult = await generateFlashcards({ text: result.text });
            setQAPairs([...qaPairs, ...aiResult]);
            setCapturedImage(null);
          } else {
            console.error("OCR failed:", result.error);
            toast({
              title: "No text found in the image",
            });
            setCapturedImage(null);
          }
        }
      } catch (error) {
        console.error("Error capturing image:", error);
        toast({
          title: "Error",
          description:
            "An error occurred while capturing the image. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        openCamera();
      }
    }
  };

  const savePairs = async () => {
    if (qaPairs.length === 0) return;

    try {
      setIsProcessing(true);
      const validPairs = qaPairs.filter((pair) => pair.question.trim() !== "");

      // check any same pairs
      const samePairs = qaPairs.filter(
        (pair, index) =>
          qaPairs.findIndex(
            (p) =>
              p.question.toLowerCase() === pair.question.toLowerCase() &&
              p.answer.toLowerCase() === pair.answer.toLowerCase()
          ) !== index
      );

      // Get existing items to check for duplicates
      const existingItems = getAmkiItems();

      // Filter out duplicates
      const uniquePairs = validPairs
        .filter((pair) => !samePairs.includes(pair))
        .filter(
          (pair) =>
            !existingItems.some(
              (item) =>
                item.question.toLowerCase() === pair.question.toLowerCase() &&
                item.answer.toLowerCase() === pair.answer.toLowerCase()
            )
        );

      // Save to localStorage using the storage utility
      saveAmkiPairs(capturedImage, uniquePairs);
      setAmkiCount(getAmkiCount());

      // Show success toast
      toast({
        title: "Saved",
        duration: 500,
      });

      // Clear everything after saving
      setQAPairs([
        { question: "", answer: "" },
        { question: "", answer: "" },
      ]);
      setCapturedImage(null);
      setRecognizedText(null);
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processText = async () => {
    if (!inputText.trim()) return;

    try {
      setIsProcessing(true);

      console.log(inputText);

      const result = await generateFlashcards({ text: inputText });
      setQAPairs([...qaPairs, ...result]);
    } catch (error) {
      console.error("Error processing text:", error);
      toast({
        title: "Error",
        description:
          "An error occurred while processing the text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCamera();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update the text fields when recognition is complete
  useEffect(() => {
    if (recognizedText) {
      const lines = recognizedText.split("\n");
      const pairs: Array<{ question: string; answer: string }> = [];

      for (let i = 0; i < lines.length; i += 2) {
        const question = lines[i] || "";
        const answer = lines[i + 1] || "";
        pairs.push({ question, answer });
      }

      setQAPairs(pairs);
    }
  }, [recognizedText]);

  const updateQAPair = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    const newPairs = [...qaPairs];
    newPairs[index] = { ...newPairs[index], [field]: value };

    // If this is the last pair and it has content, add two more empty pairs
    if (index === newPairs.length - 1 && value.trim() !== "") {
      newPairs.push({ question: "", answer: "" }, { question: "", answer: "" });
    }

    setQAPairs(newPairs);
  };

  // Initialize camera when component mounts
  useEffect(() => {
    openCamera();
    setAmkiCount(getAmkiCount());
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex bg-black text-white">
      {!isTextMode ? (
        <div className="relative w-1/2 h-[calc(100vh-4rem)] overflow-hidden bg-gray-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
            onClick={() => {
              setIsTextMode(!isTextMode);
              if (!isTextMode) {
                // When switching to text mode, stop the camera
                if (streamRef.current) {
                  streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                  streamRef.current = null;
                }
              } else {
                // When switching back to camera mode, restart the camera
                openCamera();
              }
            }}
          >
            {isTextMode ? (
              <Camera className="h-6 w-6" />
            ) : (
              <Type className="h-6 w-6" />
            )}
          </Button>
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
            {isProcessing && (
              <div className="text-white flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            )}
            <Button
              className="rounded-full h-16 w-16 bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => {
                e.stopPropagation();
                capturePhoto();
              }}
              disabled={isProcessing}
            >
              <span className="sr-only">Capture Photo</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative w-1/2 h-[calc(100vh-4rem)] overflow-hidden bg-gray-900 p-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-full bg-gray-800 text-white p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your text here to generate flashcards..."
          />
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
            onClick={() => {
              setIsTextMode(!isTextMode);
              if (!isTextMode) {
                // When switching to text mode, stop the camera
                if (streamRef.current) {
                  streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                  streamRef.current = null;
                }
              } else {
                // When switching back to camera mode, restart the camera
                openCamera();
              }
            }}
          >
            {isTextMode ? (
              <Camera className="h-6 w-6" />
            ) : (
              <Type className="h-6 w-6" />
            )}
          </Button>
          <Button
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-full h-16 w-16 bg-white hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              processText();
            }}
            disabled={isProcessing}
          >
            <span className="sr-only">Process Text</span>
          </Button>
        </div>
      )}

      <div className="w-1/2 bg-black p-2 flex flex-col h-[calc(100vh-4rem)]">
        <div className="text-white text-sm mb-2">You have {amkiCount} Amki</div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 min-h-[200px]">
            {qaPairs.map((pair, index) => (
              <div
                key={index}
                className="h-[120px] space-y-1 bg-gray-900 p-1.5 rounded-lg flex flex-col"
              >
                <textarea
                  value={pair.question}
                  onChange={(e) =>
                    updateQAPair(index, "question", e.target.value)
                  }
                  className="w-full p-1 rounded bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none text-sm h-[30px] resize-none"
                  rows={1}
                  placeholder="Question"
                  disabled={isProcessing}
                />
                <textarea
                  value={pair.answer}
                  onChange={(e) =>
                    updateQAPair(index, "answer", e.target.value)
                  }
                  className="w-full p-1 rounded bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none text-sm flex-1 resize-none"
                  rows={2}
                  placeholder="Answer"
                  disabled={isProcessing}
                />
                <div className="flex justify-end -mb-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 text-gray-500 hover:text-red-400 hover:bg-transparent"
                    onClick={() => {
                      const newPairs = qaPairs.filter((_, i) => i !== index);
                      setQAPairs(newPairs);
                    }}
                    disabled={isProcessing}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-2 flex flex-col items-center gap-1 bg-black mt-2 sticky bottom-0">
          <Button
            className="w-full h-10 bg-green-500 hover:bg-green-600 text-white text-sm"
            onClick={(e) => {
              e.stopPropagation();
              savePairs();
            }}
            disabled={
              isProcessing ||
              !qaPairs.some(
                (pair) =>
                  pair.question.trim() !== "" || pair.answer.trim() !== ""
              )
            }
          >
            Save
          </Button>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
