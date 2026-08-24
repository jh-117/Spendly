export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      key={toast.key}
      className="toast-enter fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-[#181d3a] text-white text-body-sm font-semibold px-6 py-3 rounded-full shadow-lg whitespace-nowrap"
    >
      {toast.message}
    </div>
  );
}
