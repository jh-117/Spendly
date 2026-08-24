/**
 * Category picker grid.
 * Props:
 *   categories: active Category[]
 *   selectedId: string
 *   onSelect: (id) => void
 *   frequentIds: string[] (top 3 frequent for quick picks)
 */
export default function CategoryPicker({ categories, selectedId, onSelect, frequentIds = [] }) {
  const active = categories.filter(c => c.isActive);

  // Sort: frequent first, then rest alphabetically
  const frequent = frequentIds
    .map(id => active.find(c => c.id === id))
    .filter(Boolean);
  const rest = active.filter(c => !frequentIds.includes(c.id));
  const ordered = [...frequent, ...rest];

  return (
    <div className="grid grid-cols-4 gap-3">
      {ordered.map(cat => {
        const isSelected = cat.id === selectedId;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all focus:outline-none active:scale-95 min-h-[72px] ${
              isSelected
                ? 'bg-[#181d3a] border-[#181d3a] shadow-sm scale-[1.02]'
                : 'bg-white border-[#e2e2e2] hover:bg-[#dee0ff]/30'
            }`}
          >
            <span className="text-2xl mb-1">{cat.icon}</span>
            <span className={`text-label-caps truncate w-full text-center leading-tight ${
              isSelected ? 'text-white' : 'text-[#46464d]'
            }`}>
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
