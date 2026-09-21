import { applyWhatsappTemplate } from './whatsapp-template.util';
import { DEFAULT_HELP_COMMANDS, detectWhatsappIntent } from './whatsapp-intent.util';

describe('WhatsApp intent + template', () => {
  it('detects intents from keywords', () => {
    expect(detectWhatsappIntent('STATUS please')).toBe('STATUS');
    expect(detectWhatsappIntent('order status')).toBe('STATUS');
    expect(detectWhatsappIntent('status pls')).toBe('STATUS');
    expect(detectWhatsappIntent('invoice copy')).toBe('INVOICE');
    expect(detectWhatsappIntent('send my bill')).toBe('INVOICE');
    expect(detectWhatsappIntent('HELP')).toBe('HELP');
    expect(detectWhatsappIntent('show menu')).toBe('HELP');
    expect(detectWhatsappIntent('Hi')).toBe('HELP');
    expect(detectWhatsappIntent('Hello!')).toBe('HELP');
    expect(detectWhatsappIntent('random')).toBe('UNKNOWN');
    expect(detectWhatsappIntent('my balance')).toBe('CREDIT');
    expect(detectWhatsappIntent('credit limit')).toBe('CREDIT');
  });

  it('replaces placeholders', () => {
    expect(applyWhatsappTemplate('Hi {{name}}', { name: 'A' })).toBe('Hi A');
    expect(applyWhatsappTemplate('{{a}} {{b}}', { a: '1', b: '2' })).toBe('1 2');
  });

  it('exposes help commands string', () => {
    expect(DEFAULT_HELP_COMMANDS).toContain('status');
  });
});
