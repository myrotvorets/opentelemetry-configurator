/* eslint-disable class-methods-use-this, @typescript-eslint/no-empty-function */
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/tracing';
import { Detector, Resource, ResourceDetectionConfig } from '@opentelemetry/resources';
import { OpenTelemetryConfigurator } from '../lib/index';

class MyDetector implements Detector {
    public detect(_config: ResourceDetectionConfig): Promise<Resource> {
        return Promise.resolve(Resource.empty());
    }
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
        const exporter = new MySpanExporter();

        const mockedShutdown = jest.spyOn(exporter, 'shutdown');

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            detectors: [],
            traceExporter: exporter,
        });

        await configurator.start();
        const tracer = configurator.getTraceProvider();
        expect(tracer).not.toBeUndefined();

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
