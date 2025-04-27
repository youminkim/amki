"use client";

import { useState, useRef, useEffect } from "react";
import { X, Loader2, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { processImageWithVisionAPI } from "../actions";
import { saveAmkiItem, getAmkiItems } from "@/app/lib/amkiStorage";

export default function AddPage() {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [recognizedText, setRecognizedText] = useState<string | null>(null);
    const [qaPairs, setQAPairs] = useState<
        Array<{ question: string; answer: string }>
    >([{ question: "", answer: "" }]);
    const [isSaved, setIsSaved] = useState<boolean>(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

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
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                });
            } catch (error) {
                console.log("Trying user-facing camera as fallback...");
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
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
            alert(
                "Could not access camera. Please ensure you have granted camera permissions and that your camera is working properly."
            );
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
                                    reject(
                                        new Error(
                                            "Failed to create blob from canvas"
                                        )
                                    );
                                }
                            },
                            "image/jpeg",
                            0.95
                        );
                    });

                    // Convert blob to base64
                    const reader = new FileReader();
                    const imageData = await new Promise<string>(
                        (resolve, reject) => {
                            reader.onload = () => {
                                if (typeof reader.result === "string") {
                                    resolve(reader.result);
                                } else {
                                    reject(
                                        new Error(
                                            "Failed to read blob as base64"
                                        )
                                    );
                                }
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        }
                    );

                    // Process the image immediately
                    const result = await processImageWithVisionAPI(imageData);
                    if (result.success && result.text) {
                        const lines = result.text.trim().split("\n");
                        const newPairs: Array<{
                            question: string;
                            answer: string;
                        }> = [];

                        for (let i = 0; i < lines.length; i += 2) {
                            const question = lines[i] || "";
                            const answer = lines[i + 1] || "";
                            newPairs.push({ question, answer });
                        }

                        setQAPairs([...qaPairs, ...newPairs]);
                    } else {
                        console.error("OCR failed:", result.error);
                        alert("Failed to recognize text. Please try again.");
                    }
                }
            } catch (error) {
                console.error("Error capturing image:", error);
                alert(
                    "An error occurred while capturing the image. Please try again."
                );
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const savePairs = async () => {
        if (qaPairs.length === 0) return;

        try {
            setIsProcessing(true);
            const validPairs = qaPairs.filter(
                (pair) => pair.question.trim() !== ""
            );

            // Save to localStorage using the storage utility
            const newItem = saveAmkiItem(capturedImage, validPairs);

            setIsSaved(true);
            router.push("/");
        } catch (error) {
            console.error("Error saving:", error);
            alert("Failed to save. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const retakePhoto = () => {
        // Restart the camera stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        openCamera();
    };

    // Handle keyboard events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                if (!capturedImage) {
                    capturePhoto();
                } else {
                    savePairs();
                }
            } else if (e.key === "Escape") {
                closeCamera();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [capturedImage]);

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
        setQAPairs(newPairs);
    };

    const addQAPair = () => {
        setQAPairs([...qaPairs, { question: "", answer: "" }]);
    };

    const removeQAPair = (index: number) => {
        const newPairs = qaPairs.filter((_, i) => i !== index);
        setQAPairs(newPairs);
    };

    // Initialize camera when component mounts
    useEffect(() => {
        openCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="relative flex-1 w-full h-1/2 overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                    onError={(e) => console.error("Video element error:", e)}
                />
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
                    onClick={(e) => {
                        e.stopPropagation();
                        closeCamera();
                    }}
                >
                    <X className="h-6 w-6" />
                </Button>
                <Button
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-full h-16 w-16 bg-white hover:bg-gray-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        capturePhoto();
                    }}
                    disabled={isProcessing}
                >
                    <span className="sr-only">Capture Photo</span>
                </Button>
            </div>

            <div className="h-1/2 bg-black p-4 overflow-y-auto">
                {isProcessing ? (
                    <div className="text-white flex items-center gap-2 mb-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isSaved ? "Saving..." : "Processing text..."}
                    </div>
                ) : null}
                <div className="grid grid-cols-3 gap-4">
                    {qaPairs.map((pair, index) => (
                        <div
                            key={index}
                            className="space-y-2 bg-gray-900 p-3 rounded-lg"
                        >
                            <textarea
                                value={pair.question}
                                onChange={(e) =>
                                    updateQAPair(
                                        index,
                                        "question",
                                        e.target.value
                                    )
                                }
                                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                                rows={2}
                                placeholder="Question"
                                disabled={isProcessing}
                            />
                            <textarea
                                value={pair.answer}
                                onChange={(e) =>
                                    updateQAPair(
                                        index,
                                        "answer",
                                        e.target.value
                                    )
                                }
                                className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                                rows={4}
                                placeholder="Answer"
                                disabled={isProcessing}
                            />
                            <div className="flex justify-end -mb-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0 text-gray-500 hover:text-red-400 hover:bg-transparent"
                                    onClick={() => removeQAPair(index)}
                                    disabled={isProcessing}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Button
                        variant="outline"
                        size="icon"
                        className="w-full h-full rounded-lg bg-black text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white flex items-center justify-center"
                        onClick={addQAPair}
                        disabled={isProcessing}
                    >
                        <span className="text-2xl">+</span>
                    </Button>
                </div>
            </div>

            <div className="p-4 flex flex-col items-center gap-2 bg-black">
                <Button
                    className="w-full h-12 bg-green-500 hover:bg-green-600 text-white"
                    onClick={(e) => {
                        e.stopPropagation();
                        savePairs();
                    }}
                    disabled={
                        isProcessing ||
                        !qaPairs.some(
                            (pair) =>
                                pair.question.trim() !== "" ||
                                pair.answer.trim() !== ""
                        )
                    }
                >
                    Save
                </Button>
                <div className="text-white text-sm text-center">
                    {isProcessing
                        ? isSaved
                            ? "Saving..."
                            : "Processing text..."
                        : ""}
                </div>
            </div>
        </div>
    );
}
