/* eslint-disable class-methods-use-this, @typescript-eslint/no-empty-function */
import { Logger } from '@opentelemetry/api';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/tracing';
import { Detector, Resource, ResourceDetectionConfigWithLogger } from '@opentelemetry/resources';
import { OpenTelemetryConfigurator } from '../lib/index';

class MyDetector implements Detector {
    public detect(_config: ResourceDetectionConfigWithLogger): Promise<Resource> {
        return Promise.resolve(Resource.empty());
    }
}

class MyLogger implements Logger {
    public error(_message: string, ..._args: unknown[]): void {}
    public warn(_message: string, ..._args: unknown[]): void {}
    public info(_message: string, ..._args: unknown[]): void {}
    public debug(_message: string, ..._args: unknown[]): void {}
}

class MySpanExporter implements SpanExporter {
    public export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
        resultCallback({ code: ExportResultCode.SUCCESS });
    }

    public shutdown(): Promise<void> {
        return Promise.resolve();
    }
}

const env = { ...process.env };

describe('OpenTelemetryConfigurator', () => {
    afterEach(() => {
        process.env = { ...env };
    });

    it('should pass a basic test', async () => {
        const logger = new MyLogger();
        const exporter = new MySpanExporter();

        const mockedShutdown = jest.spyOn(exporter, 'shutdown');

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            logger,
            detectors: [],
            traceExporter: exporter,
        });

        await configurator.start();
        const tracer = configurator.getTraceProvider();
        expect(tracer).not.toBeUndefined();
        expect(tracer?.logger).toBe(logger);

        await configurator.shutdown();
        expect(mockedShutdown).toHaveBeenCalledTimes(1);
    });

    it('should not reinitialize tracer multiple times', async () => {
        const detector = new MyDetector();

        const mockedDetect = jest.spyOn(detector, 'detect');

        process.env = {};
        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            detectors: [detector],
        });

        await configurator.start();
        await configurator.start();

        expect(mockedDetect).toHaveBeenCalledTimes(1);
    });

    it('should shut down on a termination signal', async () => {
        const exporter = new MySpanExporter();

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            detectors: [],
            traceExporter: exporter,
        });

        await configurator.start();
        let tracer = configurator.getTraceProvider();
        expect(tracer).not.toBeUndefined();

        process.emit('SIGTERM', 'SIGTERM');

        tracer = configurator.getTraceProvider();
        expect(tracer).toBeUndefined();
    });

    it('should handle double shutdown', async () => {
        const exporter = new MySpanExporter();

        const mockedShutdown = jest.spyOn(exporter, 'shutdown');

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            detectors: [],
            traceExporter: exporter,
        });

        await configurator.start();
        await configurator.shutdown();
        await configurator.shutdown();
        expect(mockedShutdown).toHaveBeenCalledTimes(1);
    });
});
