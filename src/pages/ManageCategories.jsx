import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useToast } from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';

// Pastel bg colors for category icon containers
const ICON_BG_COLORS = [
  '#FFF3E0', '#E3F2FD', '#FCE4EC', '#E8F5E9',
  '#F3E5F5', '#E0F7FA', '#FFF8E1', '#EDE7F6',
];

const EMOJI_OPTIONS = [
  '🍜','🍔','🍕','☕','🛍️','🚗','🏠','🎮','📚','💊','✈️','🎬','🛒',
  '💼','🎁','🐾','🧴','⚽','🎵','💡','🔧','📱','💻','🧘','🌿',
];

export default function ManageCategories() {
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, toggleCategory } = useCategories();
  const { toast, showToast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const activeCount = categories.filter(c => c.isActive).length;

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCategory({ name: newName.trim(), icon: newIcon });
    setNewName('');
    setNewIcon('📦');
    setShowAddForm(false);
    showToast('Category added ✓');
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setNewName(cat.name);
    setNewIcon(cat.icon);
  };

  const handleSaveEdit = (id) => {
    if (!newName.trim()) return;
    updateCategory(id, { name: newName.trim(), icon: newIcon });
    setEditingId(null);
    showToast('Category updated ✓');
  };

  return (
    <div className="bg-[#f9f9f9] min-h-screen text-[#1a1c1c] antialiased pb-32">
      {/* Header */}
      <header className="w-full top-0 sticky z-50 bg-[#f9f9f9]/90 backdrop-blur-md">
        <div className="flex justify-between items-center px-5 py-4 max-w-[768px] mx-auto h-16">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#e8e8e8] transition-colors text-[#181d3a]"
          >
            <span className="material-symbols-outlined icon-fill">arrow_back</span>
          </button>
          <h1 className="text-headline-lg-mobile font-bold text-[#181d3a] absolute left-1/2 -translate-x-1/2">
            Categories
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-[768px] mx-auto px-5 pt-4">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-headline-lg-mobile font-bold text-[#181d3a]">Manage Categories</h2>
            <p className="text-body-sm text-[#64748B] mt-1">Organize your spending habits</p>
          </div>
          <span className="text-label-caps text-[#64748B] bg-[#e8e8e8] px-3 py-1 rounded-full">
            {activeCount} ACTIVE
          </span>
        </div>

        {/* Category List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl p-4 border border-[#e2e2e2] flex items-center justify-between transition-all duration-200 ${
                !cat.isActive ? 'opacity-50' : ''
              }`}
            >
              {editingId === cat.id ? (
                /* Edit inline */
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowEmojiPicker(showEmojiPicker === cat.id ? false : cat.id)}
                      className="text-3xl"
                    >
                      {newIcon}
                    </button>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="flex-1 border-b border-[#181d3a] bg-transparent text-body-md text-[#1a1c1c] focus:outline-none pb-1"
                      autoFocus
                    />
                  </div>
                  {showEmojiPicker === cat.id && (
                    <div className="grid grid-cols-8 gap-1 bg-[#F8FAFC] rounded-xl p-2">
                      {EMOJI_OPTIONS.map(e => (
                        <button key={e} onClick={() => { setNewIcon(e); setShowEmojiPicker(false); }}
                          className="text-xl hover:bg-[#e2e2e2] rounded p-1">{e}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)}
                      className="flex-1 py-2 rounded-full border border-[#e2e2e2] text-body-sm text-[#46464d] hover:bg-[#f3f3f3] active:scale-95 transition-all">
                      Cancel
                    </button>
                    <button onClick={() => handleSaveEdit(cat.id)}
                      className="flex-1 py-2 rounded-full bg-[#181d3a] text-white text-body-sm hover:opacity-90 active:scale-95 transition-all">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${!cat.isActive ? 'grayscale' : ''}`}
                      style={{ backgroundColor: ICON_BG_COLORS[idx % ICON_BG_COLORS.length] }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <h3 className="text-headline-lg-mobile font-semibold text-[#1a1c1c] leading-tight">{cat.name}</h3>
                      {cat.isDefault && (
                        <p className="text-label-caps text-[#64748B]">Default</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="text-[#64748B] hover:text-[#181d3a] transition-colors"
                      aria-label="Edit"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    {/* Toggle switch */}
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0 ${
                        cat.isActive ? 'bg-[#181d3a]' : 'bg-[#e2e2e2]'
                      }`}
                    >
                      <span
                        className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                          cat.isActive ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Add New Category Button */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#f9f9f9] via-[#f9f9f9]/90 to-transparent z-40">
        <div className="max-w-[768px] mx-auto">
          {showAddForm ? (
            <div className="bg-white rounded-2xl p-4 border border-[#e2e2e2] shadow-lg flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEmojiPicker(showEmojiPicker === 'new' ? false : 'new')}
                  className="text-3xl"
                >
                  {newIcon}
                </button>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 border-b border-[#181d3a] bg-transparent text-body-md text-[#1a1c1c] focus:outline-none pb-1 placeholder:text-[#dadada]"
                  autoFocus
                />
              </div>
              {showEmojiPicker === 'new' && (
                <div className="grid grid-cols-8 gap-1 bg-[#F8FAFC] rounded-xl p-2">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} onClick={() => { setNewIcon(e); setShowEmojiPicker(false); }}
                      className="text-xl hover:bg-[#e2e2e2] rounded p-1">{e}</button>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAddForm(false); setNewName(''); setNewIcon('📦'); }}
                  className="flex-1 py-3 rounded-full border border-[#e2e2e2] text-body-md text-[#46464d] font-semibold hover:bg-[#f3f3f3] active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="flex-1 py-3 rounded-full bg-[#181d3a] text-white font-semibold text-body-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                >
                  Add Category
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-[#181d3a] text-white text-headline-lg-mobile font-semibold py-4 px-8 rounded-full shadow-[0_8px_16px_rgba(24,29,58,0.2)] flex items-center gap-2 hover:opacity-90 active:scale-95 w-full justify-center transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              Add New Category
            </button>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
}
