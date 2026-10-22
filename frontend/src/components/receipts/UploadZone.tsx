"use client";

import { DragEvent, useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";
import Button from "@/components/ui/Button";
import CameraCapture from "./CameraCapture";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 8 * 1024 * 1024;

type Props = { onFile: (file: File) => void };

export default function UploadZone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError("Please choose a JPG, PNG or WEBP photo.");
    if (file.size > MAX_SIZE) return setError("This photo is larger than 8 MB. Please choose a smaller one.");
    setError("");
    onFile(file);
  }

  // Phones and tablets: native camera app (best quality). Computers: webcam in a dialog.
  function takePhoto() {
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (isTouchDevice) cameraRef.current?.click();
    else setCameraOpen(true);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files[0]);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition ${
          dragging ? "border-brand bg-brand-soft" : "border-line bg-white"
        }`}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <ImageUp size={30} />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-ink">Drop your receipt photo here</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          We read the store, date and total for you. You check everything before it is saved.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => inputRef.current?.click()}>
            <ImageUp size={18} />
            Choose a photo
          </Button>
          <Button variant="secondary" onClick={takePhoto}>
            <Camera size={18} />
            Take a photo
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted">Drag and drop, choose a file or use your camera · JPG, PNG or WEBP · up to 8 MB</p>
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => {
          setCameraOpen(false);
          pick(file);
        }}
      />

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
