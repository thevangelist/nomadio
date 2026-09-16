import { DEFAULT_SETTINGS, Settings } from '@nomadio/shared';

/** In-memory for V1; a store goes behind this class when persistence is added. */
export class SettingsStore {
  private current: Settings = structuredClone(DEFAULT_SETTINGS);

  get(): Settings {
    return this.current;
  }

  update(patch: unknown): Settings {
    const merged = Settings.parse({ ...this.current, ...(patch as object) });
    if (merged.autoQualityLadder.enabled) {
      throw new Error('autoQualityLadder is not implemented in V1 and cannot be enabled');
    }
    this.current = merged;
    return this.current;
  }
}
