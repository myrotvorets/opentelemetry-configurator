import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { expect } from 'chai';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { SpanKind } from '@opentelemetry/api';
import { fs_endHook, fs_endHook_updateName, http_applyCustomAttributesOnSpan } from '../lib/index.mjs';

describe('callbacks', function () {
    let provider: BasicTracerProvider;

    before(function () {
        provider = new BasicTracerProvider();
    });

    describe('fs_endHook', function () {
        it('should work', function () {
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

    describe('fs_endHook_updateName', function () {
        it('should work', function () {
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

    describe('http_applyCustomAttributesOnSpan', function () {
        it('should work', function () {
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

        it('should prefer originalUrl', function () {
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
    });
});
