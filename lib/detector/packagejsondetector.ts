import { promises } from 'fs';
import { dirname, join, resolve } from 'path';
import { Detector, Resource, ResourceDetectionConfigWithLogger, SERVICE_RESOURCE } from '@opentelemetry/resources';

class PackageJsonDetector implements Detector {
    // eslint-disable-next-line class-methods-use-this
    public async detect(_config: ResourceDetectionConfigWithLogger): Promise<Resource> {
        try {
            const file = await PackageJsonDetector.findPackageJson();
            const raw = await promises.readFile(file, { encoding: 'utf-8' });
            const json = JSON.parse(raw) as Record<string, unknown>;

            return new Resource({
                [SERVICE_RESOURCE.NAME]: `${json.name}`,
                [SERVICE_RESOURCE.VERSION]: `${json.version}`,
            });
        } catch (e) {
            // Do nothing
        }

        return Resource.empty();
    }

    private static async findPackageJson(): Promise<string> {
        const locations = PackageJsonDetector.getLocations();
        for (const location of locations) {
            // eslint-disable-next-line no-await-in-loop
            if (await PackageJsonDetector.fileExists(location)) {
                return location;
            }
        }

        throw new Error();
    }

    private static getLocations(): string[] {
        const locations: string[] = [];
        // istanbul ignore next
        if (require.main?.filename) {
            locations.push(resolve(join(dirname(require.main.filename), 'package.json')));
            locations.push(resolve(join(dirname(require.main.filename), '..', 'package.json')));
        }

        const cwd = process.cwd();
        locations.push(resolve(join(cwd, 'package.json')));

        return locations;
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
