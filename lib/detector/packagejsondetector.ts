import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
    DetectorSync,
    IResource,
    Resource,
    ResourceAttributes,
    ResourceDetectionConfig,
} from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import debug from 'debug';

const dbg = debug('otcfg');

class PackageJsonDetector implements DetectorSync {
    // eslint-disable-next-line class-methods-use-this
    public detect(_config: ResourceDetectionConfig): IResource {
        return new Resource({}, PackageJsonDetector.getAsyncAttributes());
    }

    private static async getAsyncAttributes(): Promise<ResourceAttributes> {
        try {
            const file = await PackageJsonDetector.findPackageJson();
            const raw = await readFile(file, { encoding: 'utf-8' });
            const json = JSON.parse(raw) as Record<string, unknown>;
            return {
                [SemanticResourceAttributes.SERVICE_NAME]: `${json.name}`,
                [SemanticResourceAttributes.SERVICE_VERSION]: `${json.version}`,
            };
        } catch (e) {
            return {};
        }
    }

    private static async findPackageJson(): Promise<string> {
        const locations = PackageJsonDetector.getLocations();
        for (const location of locations) {
            dbg('PackageJsonDetector: trying', location);
            // eslint-disable-next-line no-await-in-loop
            if (await PackageJsonDetector.fileExists(location)) {
                dbg('PackageJsonDetector: found', location);
                return location;
            }
        }

        throw new Error();
    }

    private static getLocations(): string[] {
        const locations: string[] = [];
        // istanbul ignore next
        if (require.main?.filename) {
            locations.push(
                join(dirname(require.main.filename), 'package.json'),
                join(dirname(require.main.filename), '..', 'package.json'),
            );
        }

        const cwd = process.cwd();
        locations.push(join(cwd, 'package.json'));

        return locations.map((item) => resolve(item));
    }

    private static async fileExists(path: string): Promise<boolean> {
        try {
            const stats = await stat(path);
            return stats.isFile();
        } catch (e) {
            return false;
        }
    }
}

export const packageJsonDetector = new PackageJsonDetector();
