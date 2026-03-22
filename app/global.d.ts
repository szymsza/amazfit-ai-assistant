/// <reference path="node_modules/@zeppos/device-types/dist/index.d.ts" />

// Zepp OS runtime globals not covered by @zeppos/device-types
declare function AppSideService(option: Record<string, any>): void;
declare function AppSettingsPage(option: Record<string, any>): void;

// Zepp OS build-time loader for platform-specific layouts
declare module "zosLoader:./index.page.[pf].layout.js" {
  export const TEXT_STYLE: Record<string, any>;
  export const DEVICE_WIDTH: number;
  export const DEVICE_HEIGHT: number;
}
