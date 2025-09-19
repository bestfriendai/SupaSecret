import type { FlashListProps } from "@shopify/flash-list";

declare module "@shopify/flash-list" {
  interface FlashListProps<TItem> {
    /** Custom augmentation so we can provide estimated item sizing in this codebase. */
    estimatedItemSize?: number;
  }
}
