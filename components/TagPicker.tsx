'use client';

import { useState, useEffect, useRef } from 'react';
import { tagRepository } from '@/lib/domain';
import { TagBadge } from './TagBadge';
import type { Tag } from '@/lib/domain';

interface TagPickerProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  placeholder?: string;
}

const PRESET_COLORS = [
  '#4CAF50',
  '#2196F3',
  '#FF9800',
  '#E91E63',
  '#9C27B0',
  '#00BCD4',
  '#FF5722',
  '#795548',
];

export function TagPicker({
  selectedTagIds,
  onChange,
  placeholder = 'Add tags...',
}: TagPickerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tagRepository.list().then(setAllTags);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));
  const filtered = allTags.filter(
    (t) =>
      !selectedTagIds.includes(t.id) &&
      t.name.toLowerCase().includes(inputValue.toLowerCase())
  );
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === inputValue.trim().toLowerCase()
  );

  const handleSelect = (tagId: string) => {
    onChange([...selectedTagIds, tagId]);
    setInputValue('');
    setShowDropdown(false);
  };

  const handleRemove = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreate = async () => {
    const tag = await tagRepository.create({
      name: inputValue.trim(),
      color: selectedColor,
    });
    setAllTags((prev) => [...prev, tag]);
    onChange([...selectedTagIds, tag.id]);
    setInputValue('');
    setShowColorPicker(false);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 items-center px-3 py-2 neu-pressed rounded-xl bg-background min-h-[44px]">
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            onRemove={() => handleRemove(tag.id)}
          />
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
            setShowColorPicker(false);
          }}
          onFocus={() => setShowDropdown(true)}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm"
          placeholder={selectedTags.length === 0 ? placeholder : ''}
        />
      </div>

      {showDropdown && (inputValue || filtered.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 neu-floating rounded-xl bg-background max-h-48 overflow-y-auto z-10">
          {filtered.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleSelect(tag.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
            >
              {tag.color && (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
              )}
              {tag.name}
            </button>
          ))}
          {inputValue.trim() && !exactMatch && !showColorPicker && (
            <button
              type="button"
              onClick={() => setShowColorPicker(true)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors text-primary font-medium"
            >
              Create: {inputValue.trim()}
            </button>
          )}
          {showColorPicker && (
            <div className="px-3 py-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Pick a color:</p>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      selectedColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className="text-xs font-medium text-primary hover:underline"
              >
                Create &quot;{inputValue.trim()}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
