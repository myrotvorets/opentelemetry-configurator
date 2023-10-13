/* eslint-disable class-methods-use-this, @typescript-eslint/no-empty-function */
import { expect } from 'chai';
import { explain, func, replace } from 'testdouble';
import { type ExportResult, ExportResultCode } from '@opentelemetry/core';
import { type ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { type DetectorSync, type IResource, Resource, type ResourceDetectionConfig } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
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

    beforeEach(function () {
        env = {
            NODE_ENV: 'test',
        };
    });

    afterEach(function () {
        process.env = { ...env };
    });

    it('should pass a basic test', async function () {
        const exporter = new MySpanExporter();
        const shutdownSpy = func();
        replace(exporter, 'shutdown', shutdownSpy);

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            resourceDetectors: [],
            traceExporter: exporter,
        });

        const started = configurator.start();
        expect(started).to.be.true;

        const finished = await configurator.shutdown();
        expect(finished).to.be.true;
        expect(explain(shutdownSpy).callCount).to.equal(1);
    });

    it('should not reinitialize tracer multiple times', async function () {
        const detector = new MyDetector();
        const detectSpy = func();
        replace(detector, 'detect', detectSpy);

        process.env = {};
        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            resourceDetectors: [detector],
        });

        try {
            let started: boolean;
            started = configurator.start();
            expect(started).to.be.true;
            started = configurator.start();
            expect(started).to.be.false;

            expect(explain(detectSpy).callCount).to.equal(1);
        } finally {
            await configurator.shutdown();
        }
    });

    it('should shut down on a termination signal', async function () {
        const exporter = new MySpanExporter();

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            resourceDetectors: [],
            traceExporter: exporter,
        });

        const started = configurator.start();
        expect(started).to.be.true;

        process.emit('SIGTERM', 'SIGTERM');

        const finished = await configurator.shutdown();
        expect(finished).to.be.false;
    });

    it('should handle double shutdown', async function () {
        const exporter = new MySpanExporter();
        const shutdownSpy = func();
        replace(exporter, 'shutdown', shutdownSpy);

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            resourceDetectors: [],
            traceExporter: exporter,
        });

        const started = configurator.start();
        expect(started).to.be.true;

        let finished: boolean;
        finished = await configurator.shutdown();
        expect(finished).to.be.true;
        finished = await configurator.shutdown();
        expect(finished).to.be.false;
        expect(explain(shutdownSpy).callCount).to.equal(1);
    });

    it('should add default detectors', function () {
        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            resourceDetectors: [],
        });

        expect(configurator.config.resourceDetectors?.length).to.be.greaterThan(0);
    });

    it('should set a metrics exporter from environment', function () {
        process.env.OTEL_METRICS_EXPORTER = 'otlp';
        process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = 'http://localhost:4317';

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
        });

        expect(configurator.config.metricReader).to.be.an('object').that.is.instanceOf(PeriodicExportingMetricReader);
    });

    it('should set a log exporter from environment', function () {
        process.env.OTEL_LOGS_EXPORTER = 'otlp';
        process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = 'http://localhost:4317';

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
        });

        expect(configurator.config.logRecordProcessor).to.be.an('object').that.is.instanceOf(SimpleLogRecordProcessor);
    });
});
