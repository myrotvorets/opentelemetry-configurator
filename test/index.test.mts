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
            resourceDetectors: [],
            traceExporter: exporter,
        });

        const started = configurator.start();
        expect(started).to.be.true;

        const finished = await configurator.shutdown();
        expect(finished).to.be.true;
        expect(td.explain(shutdownSpy).callCount).to.equal(1);
    });

    it('should not reinitialize tracer multiple times', async function () {
        const detector = new MyDetector();
        const detectSpy = td.func();
        td.replace(detector, 'detect', detectSpy);

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

            expect(td.explain(detectSpy).callCount).to.equal(1);
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
        const shutdownSpy = td.func();
        td.replace(exporter, 'shutdown', shutdownSpy);

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
        expect(td.explain(shutdownSpy).callCount).to.equal(1);
    });

    it('should add default detectors', function () {
        const configurator = new OpenTelemetryConfigurator({
            serviceName: 'test',
            resourceDetectors: [],
        });

        expect(configurator.config.resourceDetectors?.length).to.be.greaterThan(0);
    });
});
