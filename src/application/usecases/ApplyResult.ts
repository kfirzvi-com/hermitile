import type { Preset } from '../../domain/models/Preset';

export interface FailedStep {
    readonly command: string;
    readonly reason: string;
}

/**
 * What applying a preset did. A failed step does not stop the rest: a preset
 * that names a view from an extension that is not installed should still
 * arrange everything else.
 */
export type ApplyResult =
    | { readonly kind: 'applied'; readonly preset: Preset; readonly failures: readonly FailedStep[] }
    | { readonly kind: 'notFound'; readonly name: string }
    | { readonly kind: 'nothingToReturnTo' }
    | { readonly kind: 'noPresets' };
