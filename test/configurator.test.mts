/* eslint-disable @typescript-eslint/no-unused-expressions */
import { mock } from 'node:test';
import { expect } from 'chai';
import { type ExportResult, ExportResultCode } from '@opentelemetry/core';
import { type ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { type DetectedResource, type ResourceDetectionConfig, type ResourceDetector } from '@opentelemetry/resources';
import { OpenTelemetryConfigurator } from '../lib/index.mjs';

const detectSpy = mock.fn<ResourceDetector['detect']>(() => ({}));
const shutdownSpy = mock.fn<SpanExporter['shutdown']>(() => Promise.resolve());

class MyDetector implements ResourceDetector {
    public detect(config?: ResourceDetectionConfig): DetectedResource {
        return detectSpy(config);
    }
}

class MySpanExporter implements SpanExporter {
    public export(_spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
        resultCallback({ code: ExportResultCode.SUCCESS });
    }

    public shutdown(): Promise<void> {
        return shutdownSpy();
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

        detectSpy.mock.resetCalls();
        shutdownSpy.mock.resetCalls();
    });

    afterEach(function () {
        process.env = { ...env };
        mock.reset();
    });

    it('should pass a basic test', async function () {
        const exporter = new MySpanExporter();

        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            resourceDetectors: [],
            traceExporter: exporter,
        });

        const started = configurator.start();
        expect(started).to.be.true;

        const finished = await configurator.shutdown();
        expect(finished).to.be.true;
        expect(shutdownSpy.mock.callCount()).to.equal(1);
    });

    it('should not reinitialize tracer multiple times', async function () {
        const detector = new MyDetector();

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

            expect(detectSpy.mock.callCount()).to.equal(1);
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
        expect(shutdownSpy.mock.callCount()).to.equal(1);
    });

    it('should add default detectors', function () {
        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            resourceDetectors: [],
        });

        expect(configurator.config.resourceDetectors?.length).to.be.greaterThan(0);
    });
});
