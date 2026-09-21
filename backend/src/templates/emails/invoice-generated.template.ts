export const invoiceGeneratedTemplate = (invoiceId: string) => ({
  subject: 'Invoice generated',
  text: `Invoice ${invoiceId} has been generated for your order.`,
});
