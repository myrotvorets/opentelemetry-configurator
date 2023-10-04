import { expect } from 'chai';
import { TestDouble, explain, func } from 'testdouble';
import { SeverityNumber, logs } from '@opentelemetry/api-logs';
import { type LogRecord, LogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import type { Context } from '@opentelemetry/api';
import { Logger } from '../lib/logger.mjs';

let onEmitMock: TestDouble<LogRecordProcessor['onEmit']>;

class TestLogRecordProcessor implements LogRecordProcessor {
    // eslint-disable-next-line class-methods-use-this
    public forceFlush(): Promise<void> {
        return Promise.resolve();
    }

    // eslint-disable-next-line class-methods-use-this
    public onEmit(logRecord: LogRecord, context: Context): void {
        onEmitMock(logRecord, context);
    }

    // eslint-disable-next-line class-methods-use-this
    public shutdown(): Promise<void> {
        return Promise.resolve();
    }
}

describe('Logger', function () {
    let logger: Logger;

    before(function () {
        onEmitMock = func<LogRecordProcessor['onEmit']>();

        const loggerProvider = new LoggerProvider();
        loggerProvider.addLogRecordProcessor(new TestLogRecordProcessor());
        logs.setGlobalLoggerProvider(loggerProvider);

        logger = new Logger(loggerProvider.getLogger('test'));
    });

    describe('#log', function () {
        it('should log a message', function () {
            const expectedMessage = "I've got a message to say";
            const expectedSeverity = SeverityNumber.UNSPECIFIED;
            logger.log(expectedMessage, expectedSeverity);

            expect(explain(onEmitMock).callCount).to.equal(1);
            expect(explain(onEmitMock).calls[0].args[0]).to.be.an('object').that.includes({
                body: expectedMessage,
                severityNumber: expectedSeverity,
                severityText: '',
            });
        });
    });

    describe('#trace', function () {
        it('should log a message', function () {
            const expectedMessage = "I've got a message to say";
            const expectedSeverity = SeverityNumber.TRACE;
            logger.trace(expectedMessage);

            expect(explain(onEmitMock).callCount).to.equal(1);
            expect(explain(onEmitMock).calls[0].args[0]).to.be.an('object').that.includes({
                body: expectedMessage,
                severityNumber: expectedSeverity,
                severityText: 'TRACE',
            });
        });
    });

    describe('#debug', function () {
        it('should log a message', function () {
            const expectedMessage = "I've got a message to say";
            const expectedSeverity = SeverityNumber.DEBUG;
            logger.debug(expectedMessage);

            expect(explain(onEmitMock).callCount).to.equal(1);
            expect(explain(onEmitMock).calls[0].args[0]).to.be.an('object').that.includes({
                body: expectedMessage,
                severityNumber: expectedSeverity,
                severityText: 'DEBUG',
            });
        });
    });

    describe('#info', function () {
        it('should log a message', function () {
            const expectedMessage = "I've got a message to say";
            const expectedSeverity = SeverityNumber.INFO;
            logger.info(expectedMessage);

            expect(explain(onEmitMock).callCount).to.equal(1);
            expect(explain(onEmitMock).calls[0].args[0]).to.be.an('object').that.includes({
                body: expectedMessage,
                severityNumber: expectedSeverity,
                severityText: 'INFO',
            });
        });
    });

    describe('#warning', function () {
        it('should log a message', function () {
            const expectedMessage = "I've got a message to say";
            const expectedSeverity = SeverityNumber.WARN;
            logger.warning(expectedMessage);

            expect(explain(onEmitMock).callCount).to.equal(1);
            expect(explain(onEmitMock).calls[0].args[0]).to.be.an('object').that.includes({
                body: expectedMessage,
                severityNumber: expectedSeverity,
                severityText: 'WARN',
            });
        });
    });

    describe('#error', function () {
        it('should log a message', function () {
            const expectedMessage = "I've got a message to say";
            const expectedSeverity = SeverityNumber.ERROR;
            logger.error(expectedMessage);

            expect(explain(onEmitMock).callCount).to.equal(1);
            expect(explain(onEmitMock).calls[0].args[0]).to.be.an('object').that.includes({
                body: expectedMessage,
                severityNumber: expectedSeverity,
                severityText: 'ERROR',
            });
        });
    });

    describe('#fatal', function () {
        it('should log a message', function () {
            const expectedMessage = "I've got a message to say";
            const expectedSeverity = SeverityNumber.FATAL;
            logger.fatal(expectedMessage);

            expect(explain(onEmitMock).callCount).to.equal(1);
            expect(explain(onEmitMock).calls[0].args[0]).to.be.an('object').that.includes({
                body: expectedMessage,
                severityNumber: expectedSeverity,
                severityText: 'FATAL',
            });
        });
    });

    describe('#setAttribute', function () {
        it('should set an attribute', function () {
            const attribute = 'foo';
            const value = 'bar';
            logger.setAttribute(attribute, value);
            logger.debug('Test');

            expect(explain(onEmitMock).callCount).to.equal(1);
            expect(explain(onEmitMock).calls[0].args[0])
                .to.be.an('object')
                .that.deep.includes({
                    attributes: {
                        [attribute]: value,
                    },
                });
        });
    });

    describe('#clearAttributes', function () {
        it('should clear all attributes', function () {
            logger.setAttribute('foo', 'bar');
            logger.setAttribute('baz', 'qux');
            logger.clearAttributes();
            logger.debug('Test');

            expect(explain(onEmitMock).callCount).to.equal(1);
            expect(explain(onEmitMock).calls[0].args[0]).to.be.an('object').that.deep.includes({
                attributes: {},
            });
        });
    });
});
