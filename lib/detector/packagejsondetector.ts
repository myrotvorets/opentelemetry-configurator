import { promises } from 'fs';
import { dirname, join, resolve } from 'path';
import { Detector, Resource, ResourceDetectionConfig, SERVICE_RESOURCE } from '@opentelemetry/resources';
import debug from 'debug';

const dbg = debug('otcfg');

class PackageJsonDetector implements Detector {
    // eslint-disable-next-line class-methods-use-this
    public async detect(_config: ResourceDetectionConfig): Promise<Resource> {
        try {
            const file = await PackageJsonDetector.findPackageJson();
            const raw = await promises.readFile(file, { encoding: 'utf-8' });
            const json = JSON.parse(raw) as Record<string, unknown>;
            const attrs = {
                [SERVICE_RESOURCE.NAME]: `${json.name}`,
                [SERVICE_RESOURCE.VERSION]: `${json.version}`,
            };

            return new Resource(attrs);
        } catch (e) {
            // Do nothing
        }

        return Resource.empty();
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
            const stats = await promises.stat(path);
            return stats.isFile();
        } catch (e) {
            return false;
        }
    }
}

export const packageJsonDetector: Detector = new PackageJsonDetector();
