import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';

function request(): Request {
  return {
    headers: {},
    method: 'GET',
    originalUrl: '/api/v1/themes',
    url: '/api/v1/themes',
  } as Request;
}

describe('RequestContextMiddleware', () => {
  it('does not alter requests when diagnostics are disabled', () => {
    const context = new RequestContextService();
    const config = {
      get: jest.fn().mockReturnValue(false),
    } as unknown as ConfigService;
    const response = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    new RequestContextMiddleware(config, context).use(
      request(),
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.setHeader).not.toHaveBeenCalled();
    expect(context.get()).toBeUndefined();
  });

  it('propagates safe correlation IDs when diagnostics are enabled', () => {
    const context = new RequestContextService();
    const config = {
      get: jest.fn().mockReturnValue(true),
    } as unknown as ConfigService;
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    const next = jest.fn(() => {
      expect(context.get()).toEqual(
        expect.objectContaining({
          correlationId: 'correlation-123',
          requestId: 'request-123',
          method: 'GET',
          path: '/api/v1/themes',
        }),
      );
    });
    const req = request();
    req.headers['x-correlation-id'] = 'correlation-123';
    req.headers['x-request-id'] = 'request-123';

    new RequestContextMiddleware(config, context).use(req, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(setHeader).toHaveBeenNthCalledWith(
      1,
      'X-Correlation-Id',
      'correlation-123',
    );
    expect(setHeader).toHaveBeenNthCalledWith(2, 'X-Request-Id', 'request-123');
  });
});
