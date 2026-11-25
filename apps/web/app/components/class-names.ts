// Assemble des classes CSS en ignorant les valeurs vides.
export function classNames(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
