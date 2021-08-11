import { Stats, promises } from 'fs';
import { Resource, ResourceDetectionConfig } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { packageJsonDetector } from '../../lib/detector/packagejsondetector';

const mockedStat = jest.spyOn(promises, 'stat');
const mockedReadFile = jest.spyOn(promises, 'readFile');

const config: ResourceDetectionConfig = {
    detectors: [packageJsonDetector],
};

describe('PackageJsonDetector', () => {
    it('should return an empty resource when package.json cannot be located', () => {
        mockedStat.mockRejectedValue(new Error());
        return packageJsonDetector.detect(config).then((resource) => expect(resource).toBe(Resource.empty()));
    });

    it('should retrieve name and version from package.json', () => {
        const obj = { name: 'Package Name', version: '1.2.3' };
        const stats = new Stats();
        stats.isFile = jest.fn().mockReturnValueOnce(true);
        mockedStat.mockResolvedValueOnce(stats);
        mockedReadFile.mockResolvedValueOnce(JSON.stringify(obj));
        return packageJsonDetector.detect(config).then((resource) => {
            expect(resource).toHaveProperty('attributes', expect.any(Object));
            expect(resource.attributes).toHaveProperty([SemanticResourceAttributes.SERVICE_NAME], obj.name);
            expect(resource.attributes).toHaveProperty([SemanticResourceAttributes.SERVICE_VERSION], obj.version);
            return true;
        });
    });
});
