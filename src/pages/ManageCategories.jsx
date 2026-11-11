import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../hooks/useToast';
import { toCents, fromCents, formatCurrency } from '../lib/calculations';
import Toast from '../components/ui/Toast';

// Pastel background tints for category icon containers
const ICON_BG_COLORS = [
  '#FFF3E0', '#E3F2FD', '#FCE4EC', '#E8F5E9',
  '#F3E5F5', '#E0F7FA', '#FFF8E1', '#EDE7F6',
];

const EMOJI_OPTIONS = [
  '🍜','🍔','🍕','☕','🛍️','🚗','⛽','🏠','🎮','📚','💊','✈️','🎬','🛒',
  '💼','🎁','🐾','🧴','⚽','🎵','💡','🔧','📱','💻','🧘','🌿','🏋️','🚇','👶','🍻'
];

export default function ManageCategories() {
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, toggleCategory } = useCategories();
  const { toast, showToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [newExclude, setNewExclude] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const activeCount = categories.filter(c => c.isActive).length;

  const handleOpenAdd = () => {
    setNewName('');
    setNewIcon('📦');
    setNewExclude(false);
    setNewBudget('');
    setShowEmojiPicker(false);
    setShowAddModal(true);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const budgetInCents = newBudget.trim() ? toCents(newBudget) : null;
    await addCategory({
      name: newName.trim(),
      icon: newIcon,
      excludeFromAvg: newExclude,
      budgetInCents,
    });
    setShowAddModal(false);
    showToast('Category created ✓');
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat.id);
    setNewName(cat.name);
    setNewIcon(cat.icon);
    setNewExclude(cat.excludeFromAvg || false);
    setNewBudget(cat.budgetInCents ? fromCents(cat.budgetInCents) : '');
    setShowEmojiPicker(false);
  };

  const handleSaveEdit = async (id) => {
    if (!newName.trim()) return;
    const budgetInCents = newBudget.trim() ? toCents(newBudget) : null;
    await updateCategory(id, {
      name: newName.trim(),
      icon: newIcon,
      excludeFromAvg: newExclude,
      budgetInCents,
    });
    setEditingId(null);
    setNewBudget('');
    showToast('Category updated ✓');
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen text-[#0F1424] antialiased pb-32">
      {/* Modern Frosted Sticky Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#F8FAFC]/85 border-b border-black/[0.03]">
        <div className="flex justify-between items-center px-5 py-3.5 max-w-[768px] mx-auto">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-label="Back to Settings"
            className="w-9 h-9 rounded-full bg-white ring-1 ring-black/[0.06] flex items-center justify-center text-[#64748B] hover:text-[#0F1424] hover:shadow-xs active:scale-95 transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-[#0F1424] tracking-tight">
            Categories
          </h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="max-w-[768px] mx-auto px-5 pt-4">
        {/* Title & Stats */}
        <div className="mb-5 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-[#0F1424] tracking-tight">Manage Categories</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Customize icons, budget targets and active buckets</p>
          </div>
          <span className="text-[11px] font-bold text-[#0F1424] bg-white ring-1 ring-black/[0.06] shadow-2xs px-3 py-1 rounded-full uppercase tracking-wider">
            {activeCount} / {categories.length} Active
          </span>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {categories.map((cat, idx) => {
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className={`rounded-[24px] transition-all duration-200 ring-1 ${
                  isEditing
                    ? 'bg-white ring-[#0F1424]/15 shadow-md p-4 sm:col-span-2'
                    : cat.isActive
                    ? 'bg-white ring-black/[0.05] shadow-2xs hover:shadow-xs p-3.5 sm:p-4 flex items-center justify-between'
                    : 'bg-[#F8FAFC] ring-black/[0.03] opacity-55 p-3.5 sm:p-4 flex items-center justify-between'
                }`}
              >
                {isEditing ? (
                  /* Expanded Inline Edit Card */
                  <div className="flex flex-col gap-3.5 w-full">
                    <div className="flex items-center justify-between border-b border-black/[0.04] pb-2">
                      <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                        Edit Category
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-[#94A3B8] hover:text-[#0F1424] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>

                    {/* Icon + Name Input */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="w-12 h-12 rounded-2xl bg-[#F8FAFC] ring-1 ring-black/[0.08] hover:ring-[#0F1424]/30 flex items-center justify-center text-2xl shadow-2xs active:scale-95 transition-all flex-shrink-0"
                        title="Click to change icon"
                      >
                        {newIcon}
                      </button>
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Category Name"
                        className="flex-1 bg-[#F8FAFC] ring-1 ring-black/[0.08] focus:ring-2 focus:ring-[#0F1424] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#0F1424] outline-none"
                        autoFocus
                      />
                    </div>

                    {/* Emoji Picker Dropdown */}
                    {showEmojiPicker && (
                      <div className="bg-[#F8FAFC] rounded-2xl p-3 ring-1 ring-black/[0.05] shadow-inner max-h-40 overflow-y-auto">
                        <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                          {EMOJI_OPTIONS.map(e => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => {
                                setNewIcon(e);
                                setShowEmojiPicker(false);
                              }}
                              className={`text-xl hover:bg-white rounded-xl p-2 transition-all text-center flex items-center justify-center active:scale-95 ${
                                newIcon === e ? 'bg-white ring-1 ring-black/[0.1] shadow-2xs' : ''
                              }`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exclude Switch Tile */}
                    <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-2xl ring-1 ring-black/[0.04]">
                      <div>
                        <span className="text-xs font-semibold text-[#0F1424] block">
                          Exclude from Daily Average
                        </span>
                        <span className="text-[11px] text-[#64748B] block mt-0.5">
                          Won't count against daily safe-to-spend
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewExclude(!newExclude)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 p-0.5 ${
                          newExclude ? 'bg-[#0F1424]' : 'bg-[#E2E8F0]'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                            newExclude ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Budget Limit Tile */}
                    <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-2xl ring-1 ring-black/[0.04]">
                      <div>
                        <span className="text-xs font-semibold text-[#0F1424] block">
                          Monthly Budget Target
                        </span>
                        <span className="text-[11px] text-[#64748B]">Optional ceiling for this bucket</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white ring-1 ring-black/[0.08] rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#0F1424]">
                        <span className="text-xs text-[#64748B] font-bold">RM</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={newBudget}
                          onChange={e => setNewBudget(e.target.value)}
                          className="w-20 text-xs font-bold text-[#0F1424] bg-transparent border-none outline-none text-right tabular-nums"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2.5 rounded-xl bg-white ring-1 ring-black/[0.08] text-xs font-bold text-[#64748B] hover:text-[#0F1424] hover:bg-[#F8FAFC] active:scale-95 transition-all shadow-2xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        disabled={!newName.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-[#0F1424] hover:bg-[#1E2746] text-white text-xs font-bold active:scale-95 transition-all shadow-xs disabled:opacity-40"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Category Row */
                  <>
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-[16px] flex items-center justify-center text-2xl shadow-2xs ring-1 ring-black/[0.04] flex-shrink-0 ${
                          !cat.isActive ? 'grayscale' : ''
                        }`}
                        style={{ backgroundColor: ICON_BG_COLORS[idx % ICON_BG_COLORS.length] }}
                      >
                        {cat.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#0F1424] leading-tight truncate">
                          {cat.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {cat.isDefault && (
                            <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                              Default
                            </span>
                          )}
                          {cat.budgetInCents ? (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50/80 ring-1 ring-indigo-200/50 px-2 py-0.5 rounded-md tabular-nums">
                              {formatCurrency(cat.budgetInCents)}/mo
                            </span>
                          ) : null}
                          {cat.excludeFromAvg && (
                            <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              Excluded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="w-8 h-8 rounded-full bg-slate-100/70 hover:bg-slate-200/70 text-[#64748B] hover:text-[#0F1424] flex items-center justify-center transition-all"
                        aria-label="Edit category"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 p-0.5 ${
                          cat.isActive ? 'bg-[#0F1424]' : 'bg-[#E2E8F0]'
                        }`}
                        title={cat.isActive ? 'Active' : 'Inactive'}
                      >
                        <span
                          className={`w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                            cat.isActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Add Category CTA Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent z-30 pointer-events-none">
        <div className="max-w-[768px] mx-auto flex justify-center pointer-events-auto">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full max-w-sm bg-[#0F1424] hover:bg-[#1E2746] text-white text-sm font-bold py-3.5 px-6 rounded-full shadow-[0_10px_25px_-5px_rgba(15,20,36,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add New Category
          </button>
        </div>
      </div>

      {/* Add New Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-[28px] ring-1 ring-black/[0.08] shadow-2xl p-6 flex flex-col gap-4 mb-4 sm:mb-0 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0F1424] tracking-tight">Add New Category</h3>
                <p className="text-xs text-[#64748B] mt-0.5">Create a custom spending bucket</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-[#64748B] hover:text-[#0F1424] flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Icon & Name Input */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-12 h-12 rounded-2xl bg-[#F8FAFC] ring-1 ring-black/[0.08] hover:ring-[#0F1424]/30 flex items-center justify-center text-2xl shadow-2xs active:scale-95 transition-all flex-shrink-0"
                title="Select emoji icon"
              >
                {newIcon}
              </button>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Category Name (e.g. Pet Care, Games)"
                className="flex-1 bg-[#F8FAFC] ring-1 ring-black/[0.08] focus:ring-2 focus:ring-[#0F1424] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#0F1424] outline-none placeholder:text-[#94A3B8]"
                autoFocus
              />
            </div>

            {/* Emoji Picker Grid */}
            {showEmojiPicker && (
              <div className="bg-[#F8FAFC] rounded-2xl p-3 ring-1 ring-black/[0.05] shadow-inner max-h-40 overflow-y-auto">
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        setNewIcon(e);
                        setShowEmojiPicker(false);
                      }}
                      className={`text-xl hover:bg-white rounded-xl p-2 transition-all text-center flex items-center justify-center active:scale-95 ${
                        newIcon === e ? 'bg-white ring-1 ring-black/[0.1] shadow-2xs' : ''
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Exclude Switch Tile */}
            <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-2xl ring-1 ring-black/[0.04]">
              <div>
                <span className="text-xs font-semibold text-[#0F1424] block">
                  Exclude from Daily Average
                </span>
                <span className="text-[11px] text-[#64748B] block mt-0.5">
                  Won't count against daily safe-to-spend
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNewExclude(!newExclude)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 p-0.5 ${
                  newExclude ? 'bg-[#0F1424]' : 'bg-[#E2E8F0]'
                }`}
              >
                <span
                  className={`w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-300 ${
                    newExclude ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Budget Limit Tile */}
            <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-2xl ring-1 ring-black/[0.04]">
              <div>
                <span className="text-xs font-semibold text-[#0F1424] block">
                  Monthly Budget Limit
                </span>
                <span className="text-[11px] text-[#64748B]">Optional ceiling for this bucket</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white ring-1 ring-black/[0.08] rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#0F1424]">
                <span className="text-xs text-[#64748B] font-bold">RM</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={newBudget}
                  onChange={e => setNewBudget(e.target.value)}
                  className="w-20 text-xs font-bold text-[#0F1424] bg-transparent border-none outline-none text-right tabular-nums"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-full bg-white ring-1 ring-black/[0.08] text-xs font-bold text-[#64748B] hover:text-[#0F1424] hover:bg-[#F8FAFC] active:scale-95 transition-all shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newName.trim()}
                className="flex-1 py-3 rounded-full bg-[#0F1424] hover:bg-[#1E2746] text-white text-xs font-bold active:scale-95 transition-all shadow-xs disabled:opacity-40"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
