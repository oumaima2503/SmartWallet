"use client";

import { DragEvent, useRef, useState } from "react";
import { Camera, CircleCheck, ImageUp, ScanSearch, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import CameraCapture from "./CameraCapture";
import Hero from "@/components/ui/Hero";
import { t } from "@/lib/i18n";

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
    if (!ACCEPTED.includes(file.type)) return setError(t("Please choose a JPG, PNG or WEBP photo."));
    if (file.size > MAX_SIZE) return setError(t("This photo is larger than 8 MB. Please choose a smaller one."));
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
      <Hero>

        <div className="relative grid items-center gap-5 lg:grid-cols-5">
          {/* How it works */}
          <div className="lg:col-span-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              <Sparkles size={12} /> {t("AI receipt reader")}
            </span>
            <h2 className="mt-3 text-xl font-bold leading-tight">{t("From photo to expense in seconds")}</h2>
            <ol className="mt-4 space-y-2.5">
              {[
                { icon: Camera, title: t("Snap"), text: t("Take or choose a photo of the receipt") },
                { icon: ScanSearch, title: t("Check"), text: t("We read the store, date and total, exactly as printed") },
                { icon: CircleCheck, title: t("Save"), text: t("Confirm and it is added to your expenses") },
              ].map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex items-center gap-3">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={17} />
                    <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-brand-dark">
                      {i + 1}
                    </span>
                  </span>
                  <span className="text-sm">
                    <span className="font-semibold">{title}</span>
                    <span className="text-white/75"> · {text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center rounded-2xl border-2 border-dashed p-6 text-center text-ink transition lg:col-span-3 ${
              dragging ? "scale-[1.01] border-white bg-brand-soft" : "border-white/60 bg-white"
            }`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <ImageUp size={26} />
            </span>
            <h3 className="mt-3 text-base font-semibold">{t("Drop your receipt photo here")}</h3>
            <p className="mt-1 max-w-sm text-xs text-muted">{t("Any currency works: the total is kept as printed and converted for you.")}</p>
            <div className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button onClick={() => inputRef.current?.click()}>
                <ImageUp size={17} />
                {t("Choose a photo")}
              </Button>
              <Button variant="secondary" onClick={takePhoto}>
                <Camera size={17} />
                {t("Take a photo")}
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-muted">{t("JPG, PNG or WEBP · up to 8 MB")}</p>
          </div>
        </div>
      </Hero>

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
