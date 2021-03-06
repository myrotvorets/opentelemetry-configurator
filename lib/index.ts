import { NodeTracerConfig, NodeTracerProvider } from '@opentelemetry/node';
import { InstrumentationOption, registerInstrumentations } from '@opentelemetry/instrumentation';
import {
    Detector,
    Resource,
    ResourceDetectionConfig,
    detectResources,
    processDetector,
} from '@opentelemetry/resources';
import { BatchSpanProcessor, SimpleSpanProcessor, SpanExporter } from '@opentelemetry/tracing';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import debug from 'debug';
import { packageJsonDetector } from './detector/packagejsondetector';
import { k8sDetector } from './detector/k8sdetector';
import { dockerDetector } from './detector/dockerdetector';
import { osDetector } from './detector/osdetector';

const dbg = debug('otcfg');

export interface Config {
    serviceName: string;
    resource?: Resource;
    tracer?: Omit<NodeTracerConfig, 'plugins' | 'resource'>;
    detectors?: Detector[];
    traceExporter?: SpanExporter;
    instrumentations?: InstrumentationOption[];
}

export class OpenTelemetryConfigurator {
    private tracerProvider?: NodeTracerProvider;
    private readonly nodeTracerConfig: NodeTracerConfig;
    private readonly resourceDetectionConfig: ResourceDetectionConfig;
    private readonly traceExporter?: SpanExporter;
    private readonly instrumentations?: InstrumentationOption[];
    private unloader?: () => void;

    public constructor(config: Config) {
        this.nodeTracerConfig = {
            ...(config.tracer || {}),
            resource: config.resource || Resource.empty(),
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
    }

    public async start(): Promise<void> {
        if (this.tracerProvider) {
            return;
        }

        await this.detectResources();
        this.tracerProvider = new NodeTracerProvider(this.nodeTracerConfig);

        if (this.traceExporter) {
            const SpanProcessor = process.env.NODE_ENV === 'production' ? BatchSpanProcessor : SimpleSpanProcessor;
            this.tracerProvider.addSpanProcessor(new SpanProcessor(this.traceExporter));
        }

        this.tracerProvider.register();
        this.unloader = registerInstrumentations({
            instrumentations: this.instrumentations,
            tracerProvider: this.tracerProvider,
        });

        // istanbul ignore next
        dbg(this.tracerProvider.resource?.attributes);

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

    private async detectResources(): Promise<void> {
        const resource = await detectResources(this.resourceDetectionConfig);
        dbg(resource);
        this.nodeTracerConfig.resource = (this.nodeTracerConfig.resource as Resource).merge(resource);
    }

    private static getTraceExporter(
        serviceName: string,
        traceExporter: SpanExporter | undefined,
    ): SpanExporter | undefined {
        if (traceExporter) {
            return traceExporter;
        }

        // istanbul ignore if
        if (process.env.ZIPKIN_ENDPOINT) {
            return new ZipkinExporter({
                url: process.env.ZIPKIN_ENDPOINT,
                serviceName,
            });
        }

        // istanbul ignore if
        if (process.env.JAEGER_AGENT_HOST || process.env.JAEGER_ENDPOINT) {
            // See https://github.com/jaegertracing/jaeger-client-node#environment-variables
            return new JaegerExporter();
        }

        return undefined;
    }

    public getTraceProvider(): NodeTracerProvider | undefined {
        return this.tracerProvider;
    }
}
