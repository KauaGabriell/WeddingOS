export const MODULE_LAYERS = [
  "routes",
  "application",
  "domain",
  "infrastructure",
  "contracts",
] as const;

export type ModuleLayer = (typeof MODULE_LAYERS)[number];

export interface ModuleLayerDefinition {
  readonly path: string;
  readonly purpose: string;
}

export interface ModuleDefinition<
  TModuleName extends string,
  TRoutePrefix extends `/${string}`,
> {
  readonly module: TModuleName;
  readonly routePrefix: TRoutePrefix;
  readonly layers: Readonly<Record<ModuleLayer, ModuleLayerDefinition>>;
}

export function defineModuleDefinition<
  const TModuleName extends string,
  const TRoutePrefix extends `/${string}`,
>(definition: ModuleDefinition<TModuleName, TRoutePrefix>) {
  return definition;
}
