import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useToastStore, type Toast } from "@/store/useToastStore";

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: "border-l-green-500 bg-green-50/80",
  error: "border-l-red-500 bg-red-50/80",
  info: "border-l-(--accent-soft) bg-(--accent-light)",
  warning: "border-l-amber-500 bg-amber-50/80",
};

const iconColorMap = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-(--accent-soft)",
  warning: "text-amber-500",
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [mounted, setMounted] = useState(false);
  const Icon = iconMap[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      className={`flex items-start gap-3 border-l-4 bg-white px-4 py-3 text-sm shadow-lg ring-1 ring-black/5 transition-all duration-300 ${
        colorMap[toast.type]
      } ${mounted ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}
      role="alert"
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColorMap[toast.type]}`} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-(--text-subtle)">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded p-0.5 text-(--text-faint) transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
