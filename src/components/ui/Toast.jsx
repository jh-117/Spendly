export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      key={toast.key}
      className="toast-enter fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] bg-[#0F1424]/90 backdrop-blur-md text-white text-xs font-semibold px-5 py-2.5 rounded-full ring-1 ring-white/10 shadow-[0_12px_24px_-6px_rgba(15,20,36,0.35)] whitespace-nowrap flex items-center gap-2"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      <span>{toast.message}</span>
    </div>
  );
}
