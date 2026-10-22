"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw, RotateCcw, SwitchCamera } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

type Status = "starting" | "live" | "captured" | "error";

// Turns a camera error into a message the user can act on
function cameraErrorMessage(error: unknown) {
  const name = (error as DOMException)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access was blocked. Allow the camera in your browser's address bar, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (name === "NotReadableError") return "The camera is already used by another app. Close it and try again.";
  return "The camera could not be started.";
}

// Takes a photo with the device camera (webcam on computers) using getUserMedia
export default function CameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<{ url: string; blob: Blob } | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopCamera();
      setStatus("starting");
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera. Use \"Choose a photo\" instead.");
        setStatus("error");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        // Device names are only available after permission is granted
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter((device) => device.kind === "videoinput"));
        setStatus("live");
      } catch (err) {
        setError(cameraErrorMessage(err));
        setStatus("error");
      }
    },
    [stopCamera]
  );

  // Start when the dialog opens, always release the camera when it closes
  useEffect(() => {
    if (open) startCamera();
    return stopCamera;
  }, [open, startCamera, stopCamera]);

  // Free the preview URL
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPhoto({ url: URL.createObjectURL(blob), blob });
        setStatus("captured");
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function retake() {
    setPhoto(null);
    startCamera(cameras[cameraIndex]?.deviceId);
  }

  function switchCamera() {
    const next = (cameraIndex + 1) % cameras.length;
    setCameraIndex(next);
    startCamera(cameras[next].deviceId);
  }

  function confirmPhoto() {
    if (!photo) return;
    const file = new File([photo.blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
    setPhoto(null);
    onCapture(file);
  }

  function close() {
    stopCamera();
    setPhoto(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Take a photo of your receipt"
      description="Place the whole receipt inside the frame, in good light."
      onClose={close}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-900 sm:aspect-[4/3]">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${status === "live" ? "" : "invisible"}`}
        />

        {status === "live" && (
          // Guide frame for the receipt
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[85%] w-[60%] rounded-2xl border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(15,31,23,0.35)] sm:w-[45%]" />
          </div>
        )}

        {status === "captured" && photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="Captured receipt" className="absolute inset-0 h-full w-full object-contain" />
        )}

        {status === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80" role="status">
            <Camera size={28} className="animate-pulse" />
            <p className="text-sm">Starting the camera...</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <CameraOff size={28} />
            <p className="max-w-xs text-sm">{error}</p>
            <Button size="sm" variant="secondary" onClick={() => startCamera()}>
              <RefreshCw size={14} />
              Try again
            </Button>
          </div>
        )}

        {status === "live" && cameras.length > 1 && (
          <button
            onClick={switchCamera}
            aria-label="Switch camera"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
          >
            <SwitchCamera size={18} />
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {status === "captured" ? (
          <>
            <Button variant="secondary" onClick={retake}>
              <RotateCcw size={16} />
              Retake
            </Button>
            <Button onClick={confirmPhoto}>Use this photo</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={capture} disabled={status !== "live"}>
              <Camera size={18} />
              Take photo
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
