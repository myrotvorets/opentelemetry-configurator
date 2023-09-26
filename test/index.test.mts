/* eslint-disable class-methods-use-this, @typescript-eslint/no-empty-function */
import { expect } from 'chai';
import * as td from 'testdouble';
import { type ExportResult, ExportResultCode } from '@opentelemetry/core';
import { type ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { type DetectorSync, type IResource, Resource, type ResourceDetectionConfig } from '@opentelemetry/resources';
import { OpenTelemetryConfigurator } from '../lib/index.mjs';

class MyDetector implements DetectorSync {
    public detect(_config: ResourceDetectionConfig): IResource {
        return Resource.empty();
    }
}

class MySpanExporter implements SpanExporter {
    public export(_spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
        resultCallback({ code: ExportResultCode.SUCCESS });
    }

    public shutdown(): Promise<void> {
        return Promise.resolve();
    }
}

describe('OpenTelemetryConfigurator', function () {
    let env: typeof process.env;

    before(function () {
        env = { ...process.env };
    });

    afterEach(function () {
        process.env = { ...env };
    });

    it('should pass a basic test', async function () {
        const exporter = new MySpanExporter();
        const shutdownSpy = td.func();
        td.replace(exporter, 'shutdown', shutdownSpy);

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            detectors: [],
            traceExporter: exporter,
        });

        configurator.start();
        const tracer = configurator.getTraceProvider();
        expect(tracer).not.to.be.undefined;

        await configurator.shutdown();
        expect(td.explain(shutdownSpy).callCount).to.equal(1);
    });

    it('should not reinitialize tracer multiple times', function () {
        const detector = new MyDetector();
        const detectSpy = td.func();
        td.replace(detector, 'detect', detectSpy);

        process.env = {};
        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            detectors: [detector],
        });

        configurator.start();
        configurator.start();

        expect(td.explain(detectSpy).callCount).to.equal(1);
    });

    it('should shut down on a termination signal', function () {
        const exporter = new MySpanExporter();

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            detectors: [],
            traceExporter: exporter,
        });

        configurator.start();
        let tracer = configurator.getTraceProvider();
        expect(tracer).not.to.be.undefined;

        process.emit('SIGTERM', 'SIGTERM');

        tracer = configurator.getTraceProvider();
        expect(tracer).to.be.undefined;
    });

    it('should handle double shutdown', async function () {
        const exporter = new MySpanExporter();
        const shutdownSpy = td.func();
        td.replace(exporter, 'shutdown', shutdownSpy);

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            detectors: [],
            traceExporter: exporter,
        });

        configurator.start();
        await configurator.shutdown();
        await configurator.shutdown();
        expect(td.explain(shutdownSpy).callCount).to.equal(1);
    });
});
