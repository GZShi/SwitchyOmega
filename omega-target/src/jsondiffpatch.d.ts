declare module "jsondiffpatch" {
  export function create(
    opts?: Record<string, unknown>,
  ): {
    diff: (oldObj: unknown, newObj: unknown) => unknown;
    patch: (obj: unknown, delta: unknown) => unknown;
  };
  export function diff(oldObj: unknown, newObj: unknown): unknown;
  export function patch(obj: unknown, delta: unknown): unknown;
  export function unpatch(obj: unknown, delta: unknown): unknown;
  export function reverse(delta: unknown): unknown;
}
