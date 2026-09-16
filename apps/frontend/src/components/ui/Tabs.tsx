import { Tabs as BaseTabs } from '@base-ui-components/react/tabs';
import type { ReactNode } from 'react';

import type { ComponentType, SVGProps } from 'react';

export type TabDef = { id: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> };

/** Section navigation: bottom bar on a phone, sidebar from 720px. Roving focus from Base UI. */
export default function Tabs({
  tabs,
  value,
  onValueChange,
  children,
}: {
  tabs: readonly TabDef[];
  value: string;
  onValueChange: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <BaseTabs.Root className="tabs" value={value} onValueChange={(v) => onValueChange(String(v))}>
      {children}
      <BaseTabs.List className="nav" aria-label="Sections">
        {tabs.map((t) => (
          <BaseTabs.Tab key={t.id} value={t.id} className="nav-tab">
            <t.Icon className="glyph" aria-hidden />
            {t.label}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
    </BaseTabs.Root>
  );
}
