"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser, Undo2, Upload, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
    onSignatureChange: (signature: string | null) => void;
    initialSignature?: string | null;
    width?: number;
    height?: number;
    className?: string;
}

const penColors = [
    { name: "Black", value: "#000000" },
    { name: "Blue", value: "#1e40af" },
    { name: "Navy", value: "#1e3a5f" },
    { name: "Dark Gray", value: "#374151" },
];

const penSizes = [
    { name: "Fine", value: 1 },
    { name: "Medium", value: 2 },
    { name: "Bold", value: 3 },
    { name: "Extra Bold", value: 4 },
];

export function SignaturePad({
    onSignatureChange,
    initialSignature = null,
    width = 400,
    height = 150,
    className,
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [mode, setMode] = useState<"draw" | "upload">("draw");
    const [uploadedImage, setUploadedImage] = useState<string | null>(initialSignature);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const historyRef = useRef<ImageData[]>([]);
    const [penColor, setPenColor] = useState("#000000");
    const [penSize, setPenSize] = useState(2);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = width;
        canvas.height = height;
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
    }, [width, height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
    }, [penColor, penSize]);

    useEffect(() => {
        if (initialSignature && mode === "upload") {
            setUploadedImage(initialSignature);
        }
    }, [initialSignature, mode]);

    const getCoordinates = useCallback(
        (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            if ("touches" in e) {
                const touch = e.touches[0];
                return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
            }
            return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
        },
        []
    );

    const saveToHistory = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current.push(imageData);
        if (historyRef.current.length > 20) historyRef.current.shift();
    }, []);

    const startDrawing = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (mode !== "draw") return;
            e.preventDefault();
            const coords = getCoordinates(e);
            if (!coords) return;
            const ctx = canvasRef.current?.getContext("2d");
            if (!ctx) return;
            saveToHistory();
            setIsDrawing(true);
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
        },
        [mode, getCoordinates, saveToHistory]
    );

    const draw = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing || mode !== "draw") return;
            e.preventDefault();
            const coords = getCoordinates(e);
            if (!coords) return;
            const ctx = canvasRef.current?.getContext("2d");
            if (!ctx) return;
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            setHasDrawn(true);
        },
        [isDrawing, mode, getCoordinates]
    );

    const stopDrawing = useCallback(() => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas && hasDrawn) {
            onSignatureChange(canvas.toDataURL("image/png"));
        }
    }, [isDrawing, hasDrawn, onSignatureChange]);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;
        saveToHistory();
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        setHasDrawn(false);
        onSignatureChange(null);
    }, [onSignatureChange, saveToHistory, penColor, penSize]);

    const undo = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas || historyRef.current.length === 0) return;
        const previousState = historyRef.current.pop();
        if (previousState) {
            ctx.putImageData(previousState, 0, 0);
            onSignatureChange(canvas.toDataURL("image/png"));
        }
    }, [onSignatureChange]);

    const handleFileUpload = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) return;
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                setUploadedImage(dataUrl);
                onSignatureChange(dataUrl);
            };
            reader.readAsDataURL(file);
        },
        [onSignatureChange]
    );

    const removeUploadedImage = useCallback(() => {
        setUploadedImage(null);
        onSignatureChange(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [onSignatureChange]);

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex gap-2">
                <Button type="button" variant={mode === "draw" ? "default" : "outline"} size="sm" onClick={() => { setMode("draw"); if (uploadedImage) removeUploadedImage(); }} className="flex-1">
                    <Pencil className="h-4 w-4 mr-1" /> Draw
                </Button>
                <Button type="button" variant={mode === "upload" ? "default" : "outline"} size="sm" onClick={() => { setMode("upload"); clearCanvas(); }} className="flex-1">
                    <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
            </div>

            {mode === "draw" ? (
                <>
                    <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                            <Label className="text-xs">Color</Label>
                            <div className="flex gap-1">
                                {penColors.map((color) => (
                                    <button key={color.value} type="button" onClick={() => setPenColor(color.value)}
                                        className={cn("w-6 h-6 rounded-full border-2 transition-all", penColor === color.value ? "border-primary ring-2 ring-primary/30 scale-110" : "border-transparent hover:border-gray-300")}
                                        style={{ backgroundColor: color.value }} title={color.name} />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Thickness</Label>
                            <div className="flex gap-1">
                                {penSizes.map((size) => (
                                    <button key={size.value} type="button" onClick={() => setPenSize(size.value)}
                                        className={cn("w-8 h-6 rounded border flex items-center justify-center transition-all", penSize === size.value ? "border-primary bg-primary/10 text-primary" : "border-gray-200 hover:border-gray-300 bg-white")}
                                        title={size.name}>
                                        <div className="rounded-full" style={{ width: `${size.value * 2 + 2}px`, height: `${size.value * 2 + 2}px`, backgroundColor: penColor }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-white">
                        <canvas ref={canvasRef} className="w-full touch-none cursor-crosshair" style={{ height: `${height}px` }}
                            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={undo} disabled={historyRef.current.length === 0}>
                            <Undo2 className="h-4 w-4 mr-1" /> Undo
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={clearCanvas} disabled={!hasDrawn}>
                            <Eraser className="h-4 w-4 mr-1" /> Clear
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Draw your signature above using mouse or touch</p>
                </>
            ) : (
                <>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    {uploadedImage ? (
                        <div className="relative border rounded-lg p-4 bg-white">
                            <img src={uploadedImage} alt="Uploaded signature" className="max-h-24 max-w-full mx-auto object-contain" />
                            <button type="button" onClick={removeUploadedImage} className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary hover:bg-muted/50">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <div className="text-center">
                                <p className="text-sm font-medium">Click to upload signature</p>
                                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
