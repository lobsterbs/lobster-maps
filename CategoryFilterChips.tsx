import type { CSSProperties } from 'react';

type Props = {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
};

export function CategoryFilterChips({ categories, selected, onSelect }: Props) {
  if (categories.length === 0) return null;

  return (
    <div className="lobster-chip-scroll" style={containerStyle}>
      <button
        onClick={() => onSelect(null)}
        style={{ ...chipStyle, ...(selected === null ? chipActiveStyle : {}) }}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelect(category === selected ? null : category)}
          style={{ ...chipStyle, ...(category === selected ? chipActiveStyle : {}) }}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  top: 74,
  left: 16,
  right: 16,
  zIndex: 4,
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  // Hide the scrollbar itself but keep it scrollable — a thin bar
  // under a frosted-glass row reads as visual clutter, not affordance
  scrollbarWidth: 'none',
  WebkitOverflowScrolling: 'touch',
};

const chipStyle: CSSProperties = {
  flexShrink: 0,
  padding: '7px 14px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(21, 21, 21, 0.72)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  color: 'var(--lobster-text-dim)',
  fontFamily: 'var(--font-body)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background 0.2s var(--ease-elastic), color 0.2s var(--ease-elastic)',
};

const chipActiveStyle: CSSProperties = {
  background: 'var(--lobster-red)',
  color: 'white',
  border: '1px solid transparent',
};
