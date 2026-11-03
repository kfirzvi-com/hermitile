import type { PresetCatalog } from '../../domain/models/PresetCatalog';

/** Where the presets come from — read on every use, so edits apply at once. */
export interface PresetSource {
    catalog(): PresetCatalog;
}
