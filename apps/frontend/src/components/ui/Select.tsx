import { Select as BaseSelect } from '@base-ui-components/react/select';

export type Option = { value: string; label: string };

export default function Select({
  value,
  onValueChange,
  options,
  'aria-label': label,
}: {
  value: string;
  onValueChange: (next: string) => void;
  options: Option[];
  'aria-label'?: string;
}) {
  return (
    <BaseSelect.Root value={value} onValueChange={(v) => v !== null && onValueChange(String(v))}>
      <BaseSelect.Trigger className="sel-trigger" aria-label={label}>
        <BaseSelect.Value />
        <BaseSelect.Icon className="sel-icon">▾</BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4}>
          <BaseSelect.Popup className="sel-popup">
            {options.map((o) => (
              <BaseSelect.Item key={o.value} value={o.value} className="sel-item">
                <BaseSelect.ItemText>{o.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className="sel-check">✓</BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
