import { expect } from 'chai';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode, Tracer } from '@opentelemetry/api';
import { filterBlanksAndNulls, recordErrorToSpan } from '../lib/utils.mjs';

describe('utils', function () {
    describe('filterBlanksAndNulls', function () {
        it('should return expected results', function () {
            const input = ['', ' ', 'null', 'foo', 'bar', 'null', 'baz', ''];
            const expected = ['foo', 'bar', 'baz'];
            const actual = filterBlanksAndNulls(input);

            expect(actual).to.deep.equal(expected);
        });
    });

    describe('recordErrorToSpan', function () {
        let provider: BasicTracerProvider;
        let tracer: Tracer;

        before(function () {
            provider = new BasicTracerProvider();
            tracer = provider.getTracer('test');
        });

        it('should convert non-errors to Error', function () {
            const expectedMessage = 'message';
            let err;
            const span = tracer.startActiveSpan('span', (span) => {
                try {
                    err = recordErrorToSpan(expectedMessage, span);
                    return span;
                } finally {
                    span.end();
                }
            });

            expect(err).to.be.instanceOf(Error).and.have.property('message', expectedMessage);
            expect(span).to.be.an('object').that.has.property('status').that.has.property('code', SpanStatusCode.ERROR);
            expect(span)
                .to.have.property('events')
                .that.has.lengthOf(1)
                .and.containSubset({
                    0: {
                        name: 'exception',
                        attributes: {
                            'exception.type': 'Error',
                            'exception.message': expectedMessage,
                        },
                    },
                });
        });

        it('should record errors', function () {
            const error = new TypeError('message');
            let err;
            const span = tracer.startActiveSpan('span', (span) => {
                try {
                    err = recordErrorToSpan(error, span);
                    return span;
                } finally {
                    span.end();
                }
            });

            expect(err).to.be.instanceOf(TypeError).and.have.property('message', error.message);
            expect(span).to.be.an('object').that.has.property('status').that.has.property('code', SpanStatusCode.ERROR);
            expect(span)
                .to.have.property('events')
                .that.has.lengthOf(1)
                .and.containSubset({
                    0: {
                        name: 'exception',
                        attributes: {
                            'exception.type': error.name,
                            'exception.message': error.message,
                            'exception.stacktrace': error.stack,
                        },
                    },
                });
        });
    });
});
