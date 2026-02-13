import type { DefineComponent } from 'vue';

export type ResolveResult = DefineComponent
                          | Promise<DefineComponent>
                          | { default: DefineComponent }
                          | Promise<{ default: DefineComponent }>;

export type ResolveCallback = (name: string) => ResolveResult;

export type ResolveTitle = (title: string) => string;

export type ResolvedComponent = DefineComponent & { layout?: any; inheritAttrs?: boolean };

export type Props = Record<string, unknown>;
