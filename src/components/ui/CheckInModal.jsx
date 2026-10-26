export default function CheckInModal({ onLogExpense, onNothingToday }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm mx-4 flex flex-col gap-6 items-center text-center">
        {/* Emoji */}
        <span className="text-5xl">📋</span>

        {/* Text */}
        <div className="flex flex-col gap-2">
          <h2 className="text-headline-lg-mobile font-bold text-[#181d3a]">
            Hey, have you tracked today?
          </h2>
          <p className="text-body-sm text-[#64748B]">
            It's past your reminder time. Keep your streak going by logging what you spent.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onLogExpense}
            className="bg-[#181d3a] text-white font-semibold py-3.5 rounded-full w-full hover:opacity-90 active:scale-95 transition-all"
          >
            Log Expense
          </button>
          <button
            onClick={onNothingToday}
            className="border border-[#e2e2e2] text-[#64748B] font-semibold py-3.5 rounded-full w-full hover:bg-[#f8fafc] active:scale-95 transition-all"
          >
            Nothing Today
          </button>
        </div>
      </div>
    </div>
  );
}
