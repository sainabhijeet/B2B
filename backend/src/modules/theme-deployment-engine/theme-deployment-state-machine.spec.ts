import { canTransition } from './theme-deployment-state-machine';

describe('deployment state machine', () => {
  it('allows only forward lifecycle transitions and terminal rollback', () => {
    expect(canTransition('QUEUED', 'PREPARING')).toBe(true);
    expect(canTransition('APPROVED' as never, 'HEALTHY')).toBe(false);
    expect(canTransition('HEALTHY', 'ROLLEDBACK')).toBe(true);
    expect(canTransition('ROLLEDBACK', 'QUEUED')).toBe(false);
  });
});
