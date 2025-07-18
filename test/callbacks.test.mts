import { before, describe, it } from 'node:test';
import { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { expect } from 'chai';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { SpanKind } from '@opentelemetry/api';
import { fs_endHook, fs_endHook_updateName, http_applyCustomAttributesOnSpan } from '../lib/index.mjs';

import './setup.mjs';

await describe('callbacks', async function () {
    let provider: BasicTracerProvider;

    before(function () {
        provider = new BasicTracerProvider();
    });

    await describe('fs_endHook', async function () {
        await it('should work', function () {
            const expectedSpanName = 'span';
            const expectedFile = '/some/file';
            const tracer = provider.getTracer('test');
            const span = tracer.startActiveSpan(expectedSpanName, (span) => {
                try {
                    fs_endHook('readFile', {
                        args: [expectedFile],
                        span,
                    });

                    return span;
                } finally {
                    span.end();
                }
            });

            expect(span).to.have.property('name', expectedSpanName);
            expect(span).to.have.property('attributes').that.has.property('fs.path', expectedFile);
        });
    });

    await describe('fs_endHook_updateName', async function () {
        await it('should work', function () {
            const spanName = 'span';
            const expectedFile = '/some/file';
            const expectedSpanName = `${spanName} - ${expectedFile}`;
            const tracer = provider.getTracer('test');
            const span = tracer.startActiveSpan(spanName, (span) => {
                try {
                    fs_endHook_updateName('readFile', {
                        args: [expectedFile],
                        span,
                    });

                    return span;
                } finally {
                    span.end();
                }
            });

            expect(span).to.have.property('name', expectedSpanName);
            expect(span).to.have.property('attributes').that.has.property('fs.path', expectedFile);
        });
    });

    await describe('http_applyCustomAttributesOnSpan', async function () {
        await it('should work for server', function () {
            const request = new IncomingMessage(new Socket());
            const response = new ServerResponse(request);
            request.url = '/some/url';
            request.method = 'GET';
            const expectedSpanName = `${request.method} ${request.url}`;
            const tracer = provider.getTracer('test');
            const span = tracer.startActiveSpan('some span', { kind: SpanKind.SERVER }, (span) => {
                try {
                    http_applyCustomAttributesOnSpan(span, request, response);
                    return span;
                } finally {
                    span.end();
                }
            });

            expect(span).to.have.property('name', expectedSpanName);
        });

        await it('should prefer originalUrl', function () {
            const request = new IncomingMessage(new Socket());
            const response = new ServerResponse(request);
            const url = '/some/url';
            const originalUrl = '/some/original/url';
            request.url = url;
            (request as IncomingMessage & Record<'originalUrl', string>).originalUrl = originalUrl;
            request.method = 'GET';
            const expectedSpanName = `${request.method} ${originalUrl}`;
            const tracer = provider.getTracer('test');
            const span = tracer.startActiveSpan('some span', { kind: SpanKind.SERVER }, (span) => {
                try {
                    http_applyCustomAttributesOnSpan(span, request, response);
                    return span;
                } finally {
                    span.end();
                }
            });

            expect(span).to.have.property('name', expectedSpanName);
        });

        await it('should work for client', function () {
            const url = new URL('http://example.com:81/?a=b');
            const request = new ClientRequest(url);
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            request.once('error', () => {});
            request.destroy();
            const response = new IncomingMessage(new Socket());

            const expectedSpanName = `${request.method} ${url.pathname}${url.search}`;
            const tracer = provider.getTracer('test');
            const span = tracer.startActiveSpan('some span', { kind: SpanKind.CLIENT }, (span) => {
                try {
                    http_applyCustomAttributesOnSpan(span, request, response);
                    return span;
                } finally {
                    span.end();
                }
            });

            expect(span).to.have.property('name', expectedSpanName);
        });
    });
});
