declare global {
  namespace JSX {
    interface IntrinsicElements {
      'm3e-search': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { placeholder?: string; onInput?: (e: Event) => void }, HTMLElement>;
      'm3e-nav-rail': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'm3e-nav-rail-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; selected?: boolean }, HTMLElement>;
      'm3e-fab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { slot?: string }, HTMLElement>;
      'm3e-fab-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'm3e-fab-menu-action': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'm3e-segmented-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { value?: string; onChange?: (e: Event) => void }, HTMLElement>;
      'm3e-segmented-button-segment': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { value?: string }, HTMLElement>;
    }
  }
}

export {};
