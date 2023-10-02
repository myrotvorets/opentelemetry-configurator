import { diag } from '@opentelemetry/api';
import { getEnv, getEnvWithoutDefaults } from '@opentelemetry/core';
import { OTLPMetricExporter as OTLPGrpcMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPMetricExporter as OTLPHttpMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPMetricExporter as OTLPProtoMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { type MetricReader, PeriodicExportingMetricReader, type PushMetricExporter } from '@opentelemetry/sdk-metrics';
import { filterBlanksAndNulls } from './utils.mjs';

export class MetricsConfigurator {
    private readonly _reader: MetricReader | undefined;

    public constructor() {
        const env = process.env;
        let exporters = filterBlanksAndNulls(Array.from(new Set((env.OTEL_METRICS_EXPORTER ?? '').split(','))));

        if (exporters.length === 0) {
            exporters = ['otlp'];
        } else if (exporters[0] === 'none' && exporters.length === 1) {
            diag.info('Metrics exporting is disabled.');
        }

        for (const value of exporters) {
            const reader = MetricsConfigurator.tryCreateReader(value);

            if (reader) {
                this._reader = reader;
                break;
            }
        }
    }

    public get reader(): MetricReader | undefined {
        return this._reader;
    }

    /**
     * @see https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#exporter-selection
     */
    protected static getOtlpProtocol(): string {
        const parsedEnvValues = getEnvWithoutDefaults();
        const env = getEnv();

        return (
            parsedEnvValues.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL ??
            parsedEnvValues.OTEL_EXPORTER_OTLP_PROTOCOL ??
            env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL // It will have a default value, no need to fall back to OTEL_EXPORTER_OTLP_PROTOCOL
        );
    }

    /**
     * @see https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/#exporter-selection
     */
    protected static configureOtlp(): PushMetricExporter | undefined {
        const protocol = MetricsConfigurator.getOtlpProtocol();

        switch (protocol) {
            case 'grpc':
                return new OTLPGrpcMetricExporter();

            case 'http/json':
                return new OTLPHttpMetricExporter();

            case 'http/protobuf':
                return new OTLPProtoMetricExporter();

            default:
                diag.warn(`Unsupported OTLP metrics protocol: ${protocol}.`);
                return undefined;
        }
    }

    protected static tryCreateReader(name: string): MetricReader | undefined {
        switch (name) {
            case 'otlp': {
                const exporter = MetricsConfigurator.configureOtlp();
                return exporter ? new PeriodicExportingMetricReader({ exporter }) : undefined;
            }

            case 'prometheus':
                return new PrometheusExporter();

            case 'none':
                return undefined;

            default:
                diag.warn(`Unsupported metrics exporter: ${name}.`);
                return undefined;
        }
    }
}
