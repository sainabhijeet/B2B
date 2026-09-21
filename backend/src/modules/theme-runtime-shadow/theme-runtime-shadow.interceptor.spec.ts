import { of } from 'rxjs';
import { ThemeRuntimeShadowInterceptor } from './theme-runtime-shadow.interceptor';

describe('ThemeRuntimeShadowInterceptor', () => {
  it('returns the legacy observable value unchanged', (done) => {
    const compare = jest.fn().mockResolvedValue(null);
    const interceptor = new ThemeRuntimeShadowInterceptor({ compare } as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          tenantId: 'tenant-1',
          headers: {},
          path: 'themes/storefront/current',
        }),
      }),
    } as never;
    interceptor
      .intercept(context, { handle: () => of({ legacy: true }) })
      .subscribe({
        next: (value) => expect(value).toEqual({ legacy: true }),
        complete: () => {
          setImmediate(() => {
            expect(compare).toHaveBeenCalledWith(
              expect.objectContaining({
                tenantId: 'tenant-1',
                channel: 'WEB',
                legacyResponse: { legacy: true },
              }),
            );
            done();
          });
        },
      });
  });
});
