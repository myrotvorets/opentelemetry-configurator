import { Stats, promises } from 'node:fs';
import { ResourceDetectionConfig } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { packageJsonDetector } from '../../lib/detector/packagejsondetector';
import { runDetector } from './helpers';

const mockedStat = jest.spyOn(promises, 'stat');
const mockedReadFile = jest.spyOn(promises, 'readFile');

const config: ResourceDetectionConfig = {
    detectors: [packageJsonDetector],
};

describe('PackageJsonDetector', () => {
    it('should return an empty resource when package.json cannot be located', () => {
        mockedStat.mockRejectedValue(new Error());
        return expect(runDetector(packageJsonDetector, config)).resolves.toHaveProperty('attributes', {});
    });

    it('should retrieve name and version from package.json', () => {
        const obj = { name: 'Package Name', version: '1.2.3' };
        const stats = new Stats();
        stats.isFile = jest.fn().mockReturnValueOnce(true);
        mockedStat.mockResolvedValueOnce(stats);
        mockedReadFile.mockResolvedValueOnce(JSON.stringify(obj));
        return expect(runDetector(packageJsonDetector, config)).resolves.toHaveProperty('attributes', {
            [SemanticResourceAttributes.SERVICE_NAME]: obj.name,
            [SemanticResourceAttributes.SERVICE_VERSION]: obj.version,
        });
    });
});
