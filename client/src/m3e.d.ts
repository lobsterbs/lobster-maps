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
      'm3e-dialog': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { open?: boolean; onClose?: () => void }, HTMLElement>;
      'm3e-heading': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { type?: string }, HTMLElement>;
      'm3e-form-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'm3e-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { variant?: string; disabled?: boolean }, HTMLElement>;
      'm3e-icon-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { selected?: boolean; title?: string }, HTMLElement>;
      'm3e-divider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export {};
