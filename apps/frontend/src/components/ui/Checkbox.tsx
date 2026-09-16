import { Checkbox as BaseCheckbox } from '@base-ui-components/react/checkbox';

/** Base UI checkbox on the Field System: square, 22px, accent fill when checked. */
export default function Checkbox({
  checked,
  onCheckedChange,
  'aria-label': label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  'aria-label'?: string;
}) {
  return (
    <BaseCheckbox.Root className="cb" checked={checked} onCheckedChange={onCheckedChange} aria-label={label}>
      <BaseCheckbox.Indicator className="cb-mark">
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
          <path d="M1.5 6.2 4.6 9.3 10.5 3" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
