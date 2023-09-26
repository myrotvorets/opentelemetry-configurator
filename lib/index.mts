import { type ContextManager, DiagConsoleLogger, type TextMapPropagator, diag } from '@opentelemetry/api';
import { getEnvWithoutDefaults } from '@opentelemetry/core';
import { type InstrumentationOption, registerInstrumentations } from '@opentelemetry/instrumentation';
import { BatchSpanProcessor, SimpleSpanProcessor, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { type NodeTracerConfig, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
    type DetectorSync,
    type IResource,
    Resource,
    type ResourceDetectionConfig,
    detectResourcesSync,
    processDetector,
} from '@opentelemetry/resources';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
    dockerDetector,
    k8sDetector,
    osDetector,
    packageJsonDetector,
} from '@myrotvorets/opentelemetry-resource-detectors';

export interface Config {
    serviceName: string;
    instrumentations?: InstrumentationOption[];
    resource?: IResource;
    detectors?: DetectorSync[];
    tracer?: Omit<NodeTracerConfig, 'plugins' | 'resource'>;
    traceExporter?: SpanExporter;
    contextManager?: ContextManager;
    propagator?: TextMapPropagator;
}

export class OpenTelemetryConfigurator {
    private readonly serviceName: string;
    private tracerProvider?: NodeTracerProvider;
    private readonly nodeTracerConfig: NodeTracerConfig;
    private readonly resourceDetectionConfig: ResourceDetectionConfig;
    private readonly traceExporter?: SpanExporter;
    private readonly instrumentations?: InstrumentationOption[];
    private readonly contextManager?: ContextManager;
    private readonly propagator?: TextMapPropagator;
    private unloader?: () => void;

    public constructor(config: Config) {
        this.serviceName = config.serviceName;

        const envWithoutDefaults = getEnvWithoutDefaults();

        if (envWithoutDefaults.OTEL_LOG_LEVEL) {
            diag.setLogger(new DiagConsoleLogger(), {
                logLevel: envWithoutDefaults.OTEL_LOG_LEVEL,
            });
        }

        this.nodeTracerConfig = {
            ...(config.tracer ?? {}),
            resource: config.resource ?? Resource.empty(),
        };

        this.resourceDetectionConfig = {
            detectors: config.detectors ?? [
                processDetector,
                osDetector,
                packageJsonDetector,
                k8sDetector,
                dockerDetector,
            ],
        };

        this.traceExporter = OpenTelemetryConfigurator.getTraceExporter(config.serviceName, config.traceExporter);
        this.instrumentations = config.instrumentations;
        this.contextManager = config.contextManager;
        this.propagator = config.propagator;
    }

    public start(): void {
        if (this.tracerProvider) {
            return;
        }

        this.unloader = registerInstrumentations({
            instrumentations: this.instrumentations,
        });

        this.detectResources();
        this.tracerProvider = new NodeTracerProvider(this.nodeTracerConfig);

        if (this.traceExporter) {
            const SpanProcessor = process.env.NODE_ENV === 'production' ? BatchSpanProcessor : SimpleSpanProcessor;
            this.tracerProvider.addSpanProcessor(new SpanProcessor(this.traceExporter));
        }

        this.tracerProvider.register({
            contextManager: this.contextManager,
            propagator: this.propagator,
        });

        process.once('SIGINT', this.shutdownHandler);
        process.once('SIGTERM', this.shutdownHandler);
        process.once('SIGQUIT', this.shutdownHandler);
    }

    public async shutdown(): Promise<void> {
        const promises: Promise<unknown>[] = [];
        if (this.tracerProvider) {
            // Trace provider will shut down the span processor
            // Span processor will shut down the span exporter
            promises.push(this.tracerProvider.shutdown());
        }

        process.off('SIGINT', this.shutdownHandler);
        process.off('SIGTERM', this.shutdownHandler);
        process.off('SIGQUIT', this.shutdownHandler);

        this.tracerProvider = undefined;

        this.unloader?.();
        this.unloader = undefined;
        await Promise.all(promises);
    }

    private readonly shutdownHandler = (): void => {
        this.shutdown().catch((e) => console.error(e));
    };

    private detectResources(): void {
        if (this.resourceDetectionConfig.detectors?.length) {
            const resource = detectResourcesSync(this.resourceDetectionConfig);
            this.nodeTracerConfig.resource = (this.nodeTracerConfig.resource as Resource).merge(resource);
        }

        (this.nodeTracerConfig.resource as Resource).merge(
            new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
            }),
        );
    }

    private static getTraceExporter(
        serviceName: string,
        traceExporter: SpanExporter | undefined,
    ): SpanExporter | undefined {
        if (traceExporter) {
            return traceExporter;
        }

        /* c8 ignore start */
        if (process.env.OTEL_EXPORTER_ZIPKIN_ENDPOINT || process.env.ZIPKIN_ENDPOINT) {
            // Environment variables:
            // OTEL_EXPORTER_ZIPKIN_ENDPOINT (ZIPKIN_ENDPOINT): Endpoint for Zipkin traces
            // OTEL_EXPORTER_ZIPKIN_TIMEOUT: Maximum time the Zipkin exporter will wait for each batch export (10s by default)
            return new ZipkinExporter({
                url: process.env.OTEL_EXPORTER_ZIPKIN_ENDPOINT ?? process.env.ZIPKIN_ENDPOINT,
                serviceName,
            });
        }
        /* c8 ignore end */

        return undefined;
    }

    public getTraceProvider(): NodeTracerProvider | undefined {
        return this.tracerProvider;
    }
}
