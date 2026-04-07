import sgMail from "@sendgrid/mail";

export function sendgridConfigured(): boolean {
  return Boolean(
    process.env.SENDGRID_API_KEY?.trim() && process.env.SENDGRID_FROM_EMAIL?.trim()
  );
}

export type AttachmentInput = {
  filename: string;
  contentBase64: string;
  mimeType?: string;
};

export async function sendEmailWithAttachment(options: {
  to: string;
  subject: string;
  text: string;
  attachment?: AttachmentInput;
}): Promise<void> {
  const key = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.SENDGRID_FROM_EMAIL?.trim();
  if (!key || !from) {
    throw new Error("SENDGRID_API_KEY and SENDGRID_FROM_EMAIL must be set.");
  }
  sgMail.setApiKey(key);

  const msg: sgMail.MailDataRequired = {
    to: options.to,
    from,
    subject: options.subject,
    text: options.text,
  };

  if (options.attachment) {
    msg.attachments = [
      {
        content: options.attachment.contentBase64,
        filename: options.attachment.filename,
        type: options.attachment.mimeType ?? "application/pdf",
        disposition: "attachment",
      },
    ];
  }

  await sgMail.send(msg);
}

/** Simple HTML or text-only transactional mail (no attachment). */
export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const key = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.SENDGRID_FROM_EMAIL?.trim();
  if (!key || !from) {
    throw new Error("SENDGRID_API_KEY and SENDGRID_FROM_EMAIL must be set.");
  }
  sgMail.setApiKey(key);

  const msg: sgMail.MailDataRequired = {
    to: options.to,
    from,
    subject: options.subject,
    text: options.text,
    ...(options.html ? { html: options.html } : {}),
  };

  await sgMail.send(msg);
}
