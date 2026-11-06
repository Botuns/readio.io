/** Ends every exhaustive `switch`. Adding a union member without a case fails to compile. */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
