/* eslint-disable mocha/no-setup-in-describe, @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { getEnv } from '@opentelemetry/core';
import { OTLPLogExporter as OTLPGrpcLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPLogExporter as OTLPHttpLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPLogExporter as OTLPProtoLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { LogsConfigurator } from '../lib/logs.mjs';

class LogsConfiguratorHelper extends LogsConfigurator {
    public static getOtlpProtocol(): string {
        return super.getOtlpProtocol();
    }

    public static configureOtlp(): ReturnType<typeof LogsConfigurator.configureOtlp> {
        return super.configureOtlp();
    }
}

describe('LogsConfigurator', function () {
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

    it('should not activate when OTEL_LOGS_EXPORTER is none', function () {
        process.env.OTEL_LOGS_EXPORTER = 'none';
        const configurator = new LogsConfigurator();
        expect(configurator.processor).to.be.undefined;
    });

    [
        // OTEL_EXPORTER_OTLP_LOGS_PROTOCOL, OTEL_EXPORTER_OTLP_PROTOCOL, expected
        [undefined, undefined, parsedEnv.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL],
        [undefined, 'grpc', 'grpc'],
        ['http/json', '', 'http/json'],
    ].forEach(([otlpMetricsProtocol, otlpProtocol, expected]) => {
        it('should return the correct OTLP protocol', function () {
            process.env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL = otlpMetricsProtocol;
            process.env.OTEL_EXPORTER_OTLP_PROTOCOL = otlpProtocol;
            expect(LogsConfiguratorHelper.getOtlpProtocol()).to.equal(expected);
        });
    });

    (
        [
            ['grpc', OTLPGrpcLogExporter],
            ['http/json', OTLPHttpLogExporter],
            ['http/protobuf', OTLPProtoLogExporter],
            ['unknown', undefined],
        ] as const
    ).forEach(([protocol, expected]) => {
        it(`should return the correct OTLP exporter for ${protocol}`, function () {
            process.env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL = protocol;
            if (expected === undefined) {
                expect(LogsConfiguratorHelper.configureOtlp()).to.be.undefined;
            } else {
                expect(LogsConfiguratorHelper.configureOtlp()).to.be.instanceOf(expected);
            }
        });
    });

    (
        [
            ['otlp', SimpleLogRecordProcessor],
            ['none', undefined],
            ['unknown', undefined],
        ] as const
    ).forEach(([name, expected]) => {
        it(`should return the correct processor for ${name}`, function () {
            process.env.OTEL_LOGS_EXPORTER = name;
            const configurator = new LogsConfigurator();
            if (expected === undefined) {
                expect(configurator.processor).to.be.undefined;
            } else {
                expect(configurator.processor).to.be.instanceOf(expected);
            }
        });
    });

    it('should return undefined when OTLP exporter cannot be determined', function () {
        process.env.OTEL_LOGS_EXPORTER = 'otlp';
        process.env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL = 'unknown';
        const configurator = new LogsConfigurator();
        expect(configurator.processor).to.be.undefined;
    });
});
