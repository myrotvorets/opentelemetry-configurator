import { Logger } from '@opentelemetry/api';
import { NodeTracerConfig, NodeTracerProvider } from '@opentelemetry/node';
import {
    Detector,
    Resource,
    ResourceDetectionConfig,
    detectResources,
    processDetector,
} from '@opentelemetry/resources';
import { BatchSpanProcessor, SpanExporter } from '@opentelemetry/tracing';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import debug from 'debug';
import { packageJsonDetector } from './detector/packagejsondetector';
import { k8sDetector } from './detector/k8sdetector';
import { dockerDetector } from './detector/dockerdetector';

const dbg = debug('otcfg');

export interface Config {
    serviceName: string;
    logger?: Logger;
    resource?: Resource;
    tracer?: Omit<NodeTracerConfig, 'logger' | 'resource'>;
    detectors?: Detector[];
    traceExporter?: SpanExporter;
}

const debugLogger: Logger = {
    debug: dbg,
    error: debug('otcfg:error'),
    warn: debug('otcfg:warn'),
    info: debug('otcfg:info'),
};

export class OpenTelemetryConfigurator {
    private traceProvider?: NodeTracerProvider;
    private readonly nodeTracerConfig: NodeTracerConfig;
    private readonly resourceDetectionConfig: ResourceDetectionConfig;
    private readonly traceExporter?: SpanExporter;

    public constructor(config: Config) {
        const logger = config.logger ?? (debug.enabled('otcfg') ? debugLogger : undefined);
        this.nodeTracerConfig = {
            ...(config.tracer || {}),
            logger: logger,
            resource: config.resource || Resource.empty(),
        };

        this.resourceDetectionConfig = {
            logger: logger,
            detectors: config.detectors ?? [processDetector, packageJsonDetector, k8sDetector, dockerDetector],
        };

        this.traceExporter = OpenTelemetryConfigurator.getTraceExporter(config.serviceName, config.traceExporter);
    }

    public async start(): Promise<void> {
        if (this.traceProvider) {
            return;
        }

        await this.detectResources();
        this.traceProvider = new NodeTracerProvider(this.nodeTracerConfig);

        if (this.traceExporter) {
            this.traceProvider.addSpanProcessor(new BatchSpanProcessor(this.traceExporter));
        }

        this.traceProvider.register();

        dbg(this.traceProvider.resource?.attributes);

        process.once('SIGINT', this.shutdownHandler);
        process.once('SIGTERM', this.shutdownHandler);
        process.once('SIGQUIT', this.shutdownHandler);
    }

    public async shutdown(): Promise<void> {
        const promises: Promise<unknown>[] = [];
        if (this.traceProvider) {
            // Trace provider will shut down the span processor
            // Span processor will shut down the span exporter
            promises.push(this.traceProvider.shutdown());
        }

        process.off('SIGINT', this.shutdownHandler);
        process.off('SIGTERM', this.shutdownHandler);
        process.off('SIGQUIT', this.shutdownHandler);

        this.traceProvider = undefined;

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
            return new JaegerExporter({
                serviceName,
            });
        }

        return undefined;
    }

    public getTraceProvider(): NodeTracerProvider | undefined {
        return this.traceProvider;
    }
}
