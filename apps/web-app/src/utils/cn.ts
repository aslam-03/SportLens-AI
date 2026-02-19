/**
 * Utility function to concatenate classNames with conditional logic.
 * Similar to clsx/classnames but lightweight.
 */

type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .trim();
}
