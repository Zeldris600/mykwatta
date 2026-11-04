export type SendEmailJobData = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};
