export enum PushPlatform {
  FCM = 'FCM',
  APNS = 'APNS',
}

export const PUSH_PLATFORMS = Object.values(PushPlatform) as [
  PushPlatform,
  ...PushPlatform[],
];
