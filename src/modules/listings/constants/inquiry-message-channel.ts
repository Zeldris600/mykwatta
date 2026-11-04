export enum InquiryMessageChannel {
  IN_APP = 'IN_APP',
  WHATSAPP = 'WHATSAPP',
}

export const INQUIRY_MESSAGE_CHANNELS = Object.values(
  InquiryMessageChannel,
) as [InquiryMessageChannel, ...InquiryMessageChannel[]];
