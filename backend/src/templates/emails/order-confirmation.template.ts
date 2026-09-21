export const orderConfirmationTemplate = (orderId: string) => ({
  subject: 'Order confirmation',
  text: `Your order ${orderId} has been placed successfully.`,
});
