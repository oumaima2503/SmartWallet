"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

// Toasts (small messages after an action) and a confirm dialog that replaces window.confirm

type Toast = { id: number; type: "success" | "error"; message: string };

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

type FeedbackContext = {
  toast: { success: (message: string) => void; error: (message: string) => void };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const Context = createContext<FeedbackContext | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<(value: boolean) => void>(() => {});
  const nextId = useRef(1);

  const show = useCallback((type: Toast["type"], message: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, type, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  const toast = useRef({
    success: (message: string) => show("success", message),
    error: (message: string) => show("error", message),
  }).current;

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmOptions(options);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    resolveRef.current(result);
    setConfirmOptions(null);
  }, []);

  return (
    <Context.Provider value={{ toast, confirm }}>
      {children}

      <Modal open={!!confirmOptions} title={confirmOptions?.title ?? ""} onClose={() => closeConfirm(false)}>
        <p className="text-sm text-muted">{confirmOptions?.message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => closeConfirm(false)}>
            Cancel
          </Button>
          <Button variant={confirmOptions?.danger ? "danger" : "primary"} onClick={() => closeConfirm(true)}>
            {confirmOptions?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </Modal>

      <div aria-live="polite" className="fixed bottom-24 left-1/2 z-[60] lg:bottom-4 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-ink shadow-lg"
          >
            {t.type === "success" ? (
              <CircleCheck size={18} className="mt-0.5 shrink-0 text-brand" />
            ) : (
              <CircleAlert size={18} className="mt-0.5 shrink-0 text-red-500" />
            )}
            <p className="flex-1">{t.message}</p>
            <button
              onClick={() => setToasts((list) => list.filter((item) => item.id !== t.id))}
              aria-label="Dismiss"
              className="text-muted hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}

export function useFeedback() {
  const context = useContext(Context);
  if (!context) throw new Error("useFeedback must be used inside FeedbackProvider");
  return context;
}
