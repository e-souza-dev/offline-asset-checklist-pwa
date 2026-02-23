type Brand<K, T> = K & { readonly __brand: T };

export type UserId = Brand<string, "UserId">;
export type AssetCode = Brand<string, "AssetCode">;
export type TemplateId = Brand<string, "TemplateId">;

export const asUserId = (v: string) => v as UserId;
export const asAssetCode = (v: string) => v as AssetCode;
export const asTemplateId = (v: string) => v as TemplateId;