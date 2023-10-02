/* eslint-disable mocha/no-setup-in-describe */
import { expect } from 'chai';
import { getEnv } from '@opentelemetry/core';
import { OTLPMetricExporter as OTLPGrpcMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPMetricExporter as OTLPHttpMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPMetricExporter as OTLPProtoMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MetricsConfigurator } from '../lib/metrics.mjs';

class MetricsConfiguratorHelper extends MetricsConfigurator {
    public static getOtlpProtocol(): string {
        return super.getOtlpProtocol();
    }

    public static configureOtlp(): ReturnType<typeof MetricsConfigurator.configureOtlp> {
        return super.configureOtlp();
    }
}

describe('MetricsConfigurator', function () {
    let env = { ...process.env };
    process.env = {};
    const parsedEnv = getEnv();

    beforeEach(function () {
        env = {
            NODE_ENV: 'test',
        };
    });

    afterEach(function () {
        process.env = { ...env };
    });

    it('should not activate when OTEL_METRICS_EXPORTER is none', function () {
        process.env.OTEL_METRICS_EXPORTER = 'none';
        const configurator = new MetricsConfigurator();
        expect(configurator.reader).to.be.undefined;
    });

    [
        // OTEL_EXPORTER_OTLP_METRICS_PROTOCOL, OTEL_EXPORTER_OTLP_PROTOCOL, expected
        [undefined, undefined, parsedEnv.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL],
        [undefined, 'grpc', 'grpc'],
        ['http/json', '', 'http/json'],
    ].forEach(([otlpMetricsProtocol, otlpProtocol, expected]) => {
        it('should return the correct OTLP protocol', function () {
            process.env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL = otlpMetricsProtocol;
            process.env.OTEL_EXPORTER_OTLP_PROTOCOL = otlpProtocol;
            expect(MetricsConfiguratorHelper.getOtlpProtocol()).to.equal(expected);
        });
    });

    (
        [
            ['grpc', OTLPGrpcMetricExporter],
            ['http/json', OTLPHttpMetricExporter],
            ['http/protobuf', OTLPProtoMetricExporter],
            ['unknown', undefined],
        ] as const
    ).forEach(([protocol, expected]) => {
        it(`should return the correct OTLP exporter for ${protocol}`, function () {
            process.env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL = protocol;
            if (expected === undefined) {
                expect(MetricsConfiguratorHelper.configureOtlp()).to.be.undefined;
            } else {
                expect(MetricsConfiguratorHelper.configureOtlp()).to.be.instanceOf(expected);
            }
        });
    });

    (
        [
            ['otlp', PeriodicExportingMetricReader],
            ['prometheus', PrometheusExporter],
            ['none', undefined],
            ['unknown', undefined],
        ] as const
    ).forEach(([name, expected]) => {
        it(`should return the correct reader for ${name}`, function () {
            process.env.OTEL_METRICS_EXPORTER = name;
            const configurator = new MetricsConfigurator();
            if (expected === undefined) {
                expect(configurator.reader).to.be.undefined;
            } else {
                expect(configurator.reader).to.be.instanceOf(expected);
            }
        });
    });

    it('should return undefined when OTLP exporter cannot be determined', function () {
        process.env.OTEL_METRICS_EXPORTER = 'otlp';
        process.env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL = 'unknown';
        const configurator = new MetricsConfigurator();
        expect(configurator.reader).to.be.undefined;
    });
});
