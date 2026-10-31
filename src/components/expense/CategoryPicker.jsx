/**
 * Refined category picker grid.
 * Props:
 *   categories: active Category[]
 *   selectedId: string
 *   onSelect: (id) => void
 *   frequentIds: string[] (top 3-4 frequent for quick picks)
 */
export default function CategoryPicker({ categories, selectedId, onSelect, frequentIds = [] }) {
  const active = categories.filter(c => c.isActive);

  // Frequent first, then rest
  const frequent = frequentIds
    .map(id => active.find(c => c.id === id))
    .filter(Boolean);
  const rest = active.filter(c => !frequentIds.includes(c.id));
  const ordered = [...frequent, ...rest];

  return (
    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5 sm:gap-3">
      {ordered.map(cat => {
        const isSelected = cat.id === selectedId;
        const isFrequent = frequentIds.includes(cat.id);

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`relative flex flex-col items-center justify-center p-3 rounded-[18px] transition-all focus:outline-none active:scale-95 min-h-[76px] ${
              isSelected
                ? 'bg-[#0F1424] text-white shadow-md ring-2 ring-[#0F1424] scale-[1.02]'
                : 'bg-white text-[#46464d] ring-1 ring-black/[0.06] hover:bg-[#F8FAFC] shadow-2xs'
            }`}
          >
            {isFrequent && !isSelected && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" title="Frequent" />
            )}
            <span className={`text-2xl mb-1.5 transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
              {cat.icon}
            </span>
            <span className={`text-xs font-semibold truncate w-full text-center leading-tight tracking-tight ${
              isSelected ? 'text-white' : 'text-[#1E2746]'
            }`}>
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
