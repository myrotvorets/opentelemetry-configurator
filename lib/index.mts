import { processDetectorSync } from '@opentelemetry/resources';
import { NodeSDK, type NodeSDKConfiguration } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, NoopSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import {
    dockerDetector,
    k8sDetector,
    osDetector,
    packageJsonDetector,
} from '@myrotvorets/opentelemetry-resource-detectors';

export type Config = { serviceName: string } & Omit<Partial<NodeSDKConfiguration>, 'serviceName'>;

export class OpenTelemetryConfigurator {
    private readonly _config: Config;
    private readonly _sdk: NodeSDK;
    private _started = false;

    public constructor(config: Config) {
        this._config = config;

        if (!this._config.traceExporter && !this._config.spanProcessor) {
            this._config.traceExporter = process.env.OTEL_EXPORTER_ZIPKIN_ENDPOINT ? new ZipkinExporter() : undefined;
            if (this._config.traceExporter) {
                /* c8 disable start */
                this._config.spanProcessor =
                    process.env.NODE_ENV === 'production'
                        ? new BatchSpanProcessor(this._config.traceExporter)
                        : new SimpleSpanProcessor(this._config.traceExporter);
                /* c8 disable end */
            } else {
                this._config.spanProcessor = new NoopSpanProcessor();
            }
        }

        if (!this._config.resourceDetectors?.length && false !== this._config.autoDetectResources) {
            this._config.resourceDetectors = [
                osDetector,
                dockerDetector,
                k8sDetector,
                packageJsonDetector,
                processDetectorSync,
            ];
        }

        this._sdk = new NodeSDK(this._config);
    }

    public start(): boolean {
        if (!this._started) {
            this._sdk.start();

            process.once('SIGINT', this.shutdownHandler);
            process.once('SIGTERM', this.shutdownHandler);
            process.once('SIGQUIT', this.shutdownHandler);

            this._started = true;
            return true;
        }

        return false;
    }

    public async shutdown(): Promise<boolean> {
        if (this._started) {
            this._started = false;
            await this._sdk.shutdown();
            return true;
        }

        return false;
    }

    private readonly shutdownHandler = (): void => {
        this.shutdown().catch((e) => console.error(e));
    };

    public get config(): Readonly<Config> {
        return this._config;
    }
}
