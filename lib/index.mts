import { type Meter, metrics } from '@opentelemetry/api';
import { type Logger, logs } from '@opentelemetry/api-logs';
import { processDetectorSync } from '@opentelemetry/resources';
import { NodeSDK, type NodeSDKConfiguration } from '@opentelemetry/sdk-node';
import {
    dockerDetector,
    k8sDetector,
    osDetector,
    packageJsonDetector,
} from '@myrotvorets/opentelemetry-resource-detectors';
import { MetricsConfigurator } from './metrics.mjs';
import { LogsConfigurator } from './logs.mjs';

export type Config = { serviceName: string } & Omit<Partial<NodeSDKConfiguration>, 'serviceName'>;

export class OpenTelemetryConfigurator {
    private readonly _config: Config;
    private readonly _sdk: NodeSDK;
    private _started = false;

    public constructor(config: Config) {
        this._config = config;

        if (!this._config.resourceDetectors?.length && false !== this._config.autoDetectResources) {
            this._config.resourceDetectors = [
                osDetector,
                dockerDetector,
                k8sDetector,
                packageJsonDetector,
                processDetectorSync,
            ];
        }

        if (!this._config.metricReader) {
            this._config.metricReader = new MetricsConfigurator().reader;
        }

        if (!this._config.logRecordProcessor) {
            this._config.logRecordProcessor = new LogsConfigurator().processor;
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

    public meter(): Meter {
        return metrics.getMeter(this._config.serviceName);
    }

    public logger(): Logger {
        return logs.getLogger(this._config.serviceName);
    }
}
