import { diag } from '@opentelemetry/api';
import { getEnv, getEnvWithoutDefaults } from '@opentelemetry/core';
import { OTLPLogExporter as OTLPGrpcLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPLogExporter as OTLPHttpLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPLogExporter as OTLPProtoLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { type LogRecordExporter, type LogRecordProcessor, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { filterBlanksAndNulls } from './utils.mjs';

export class LogsConfigurator {
    private readonly _processor: LogRecordProcessor | undefined;

    public constructor() {
        const env = process.env;
        let exporters = filterBlanksAndNulls(Array.from(new Set((env.OTEL_LOGS_EXPORTER ?? '').split(','))));

        if (exporters.length === 0) {
            exporters = ['otlp'];
        } else if (exporters[0] === 'none' && exporters.length === 1) {
            diag.info('Logs exporting is disabled.');
        }

        for (const value of exporters) {
            const processor = LogsConfigurator.tryCreateLogProcessor(value);

            if (processor) {
                this._processor = processor;
                break;
            }
        }
    }

    public get processor(): LogRecordProcessor | undefined {
        return this._processor;
    }

    /**
     * @see https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#exporter-selection
     */
    protected static getOtlpProtocol(): string {
        const parsedEnvValues = getEnvWithoutDefaults();
        const env = getEnv();

        return (
            parsedEnvValues.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL ??
            parsedEnvValues.OTEL_EXPORTER_OTLP_PROTOCOL ??
            env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL // It will have a default value, no need to fall back to OTEL_EXPORTER_OTLP_PROTOCOL
        );
    }

    /**
     * @see https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#exporter-selection
     */
    protected static configureOtlp(): LogRecordExporter | undefined {
        const protocol = LogsConfigurator.getOtlpProtocol();

        switch (protocol) {
            case 'grpc':
                return new OTLPGrpcLogExporter();

            case 'http/json':
                return new OTLPHttpLogExporter();

            case 'http/protobuf':
                return new OTLPProtoLogExporter();

            default:
                diag.warn(`Unsupported OTLP logs protocol: ${protocol}.`);
                return undefined;
        }
    }

    protected static tryCreateLogProcessor(name: string): LogRecordProcessor | undefined {
        switch (name) {
            case 'otlp': {
                const exporter = LogsConfigurator.configureOtlp();
                return exporter ? new SimpleLogRecordProcessor(exporter) : undefined;
            }

            case 'none':
                return undefined;

            default:
                diag.warn(`Unsupported logs exporter: ${name}.`);
                return undefined;
        }
    }
}
