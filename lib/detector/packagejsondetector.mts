import { readFile, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
    type DetectorSync,
    type IResource,
    Resource,
    type ResourceAttributes,
    type ResourceDetectionConfig,
} from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import debug from 'debug';

const dbg = debug('otcfg');

export class PackageJsonDetector implements DetectorSync {
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
        } catch {
            return {};
        }
    }

    private static async findPackageJson(): Promise<string> {
        const locations = PackageJsonDetector.getLocations();
        for (const location of locations) {
            dbg('PackageJsonDetector: trying %s', location);
            // eslint-disable-next-line no-await-in-loop
            if (await PackageJsonDetector.fileExists(location)) {
                dbg('PackageJsonDetector: found at %s', location);
                return location;
            }
        }

        dbg('PackageJsonDetector: failed to find package.json');
        throw new Error();
    }

    private static getLocations(): string[] {
        const locations: string[] = [];
        // istanbul ignore next
        if (process.argv[1]) {
            const dir = basename(process.argv[1]);
            locations.push(join(dir, 'package.json'), join(dir, '..', 'package.json'));
        }

        const cwd = process.cwd();
        locations.push(join(cwd, 'package.json'));

        return locations.map((item) => resolve(item));
    }

    private static async fileExists(path: string): Promise<boolean> {
        try {
            const stats = await stat(path);
            return stats.isFile();
        } catch {
            return false;
        }
    }
}

export const packageJsonDetector = new PackageJsonDetector();
