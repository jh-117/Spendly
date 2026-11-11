export default function CheckInModal({ onLogExpense, onNothingToday }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[28px] ring-1 ring-black/[0.06] shadow-xl p-7 max-w-sm w-full flex flex-col gap-5 items-center text-center">
        {/* Emoji Badge */}
        <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] ring-1 ring-black/[0.05] flex items-center justify-center text-3xl shadow-2xs">
          📋
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold text-[#0F1424] tracking-tight">
            Track today's spending?
          </h2>
          <p className="text-xs text-[#64748B] leading-relaxed">
            It's past your reminder time. Keep your streak alive by logging what you spent today.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5 w-full pt-1">
          <button
            onClick={onLogExpense}
            className="bg-[#0F1424] hover:bg-[#1E2746] text-white font-bold text-sm py-3.5 rounded-full w-full active:scale-95 transition-all shadow-xs"
          >
            Log Expense
          </button>
          <button
            onClick={onNothingToday}
            className="bg-white ring-1 ring-black/[0.08] text-[#64748B] hover:text-[#0F1424] hover:bg-[#F8FAFC] font-semibold text-sm py-3 rounded-full w-full active:scale-95 transition-all shadow-2xs"
          >
            Nothing Today
          </button>
        </div>
      </div>
    </div>
  );
}
