export const orderDispatchedTemplate = (orderId: string) => ({
  subject: 'Order dispatched',
  text: `Your order ${orderId} has been dispatched.`,
});
