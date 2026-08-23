import { useState } from 'react';
import { X, Plus, Edit2, Trash2, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../contexts/AuthContext';

interface CategoryManagementProps {
  onClose: () => void;
}

export function CategoryManagement({ onClose }: CategoryManagementProps) {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { currentOrg, canManageOrganization } = useAuth();
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  const canManageCategories = currentOrg ? canManageOrganization(currentOrg.id) : false;

  const handleAdd = async () => {
    setError('');
    if (!newCategory.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    const success = await addCategory(newCategory);
    if (success) {
      setNewCategory('');
      toast.success('Category created successfully.');
    } else {
      setError('Category already exists or is invalid');
    }
  };

  const handleStartEdit = (category: string) => {
    setEditingCategory(category);
    setEditValue(category);
    setError('');
  };

  const handleSaveEdit = async () => {
    setError('');
    if (!editValue.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    if (editingCategory) {
      const success = await updateCategory(editingCategory, editValue);
      if (success) {
        setEditingCategory(null);
        setEditValue('');
        toast.success('Category updated successfully.');
      } else {
        setError('Category already exists or is invalid');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
    setError('');
  };

  const handleDelete = async (category: string) => {
    if (confirm(`Are you sure you want to delete the category "${category}"?\n\nNote: Existing items with this category will keep their category value.`)) {
      const success = await deleteCategory(category);
      if (success) {
        toast.success('Category deleted successfully.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Manage Categories</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Permission Warning */}
          {!canManageCategories && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Only root admins and organization admins can add, edit, or delete categories.</span>
            </div>
          )}

          {/* Add New Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add New Category
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setError('');
                }}
                  onKeyPress={(e) => e.key === 'Enter' && canManageCategories && handleAdd()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter category name"
                disabled={!canManageCategories}
              />
              <button
                onClick={handleAdd}
                disabled={!canManageCategories}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Categories List */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Existing Categories ({categories.length})
            </h3>
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">
                  No categories yet. Add your first category above.
                </p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    {editingCategory === category ? (
                      <>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            setError('');
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-gray-900">{category}</span>
                        <button
                          onClick={() => handleStartEdit(category)}
                          disabled={!canManageCategories}
                          className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          title={canManageCategories ? "Edit category" : "Only root admins and organization admins can edit categories"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          disabled={!canManageCategories}
                          className="p-2 text-red-600 hover:bg-white rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          title={canManageCategories ? "Delete category" : "Only root admins and organization admins can delete categories"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
