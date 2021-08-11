import os from 'os';
import { ResourceDetectionConfig } from '@opentelemetry/resources';
import { HostArchValues, OsTypeValues, SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { osDetector } from '../../lib/detector/osdetector';

const mockedArch = jest.spyOn(os, 'arch');
const mockedType = jest.spyOn(os, 'type');

const config: ResourceDetectionConfig = {
    detectors: [osDetector],
};

describe('OSDetector', () => {
    it('should retrieve host name, architecture and OS type', () => {
        return osDetector.detect(config).then((resource) => {
            expect(resource).toHaveProperty('attributes', expect.any(Object));
            expect(resource.attributes).toHaveProperty([SemanticResourceAttributes.HOST_NAME]);
            expect(resource.attributes).toHaveProperty([SemanticResourceAttributes.HOST_ARCH]);
            expect(resource.attributes).toHaveProperty([SemanticResourceAttributes.OS_TYPE]);
            return true;
        });
    });

    it('should prefer lookup table values for architecure', () => {
        mockedArch.mockReturnValueOnce('arm');
        return osDetector.detect(config).then((resource) => {
            expect(resource).toHaveProperty(
                'attributes',
                expect.objectContaining({
                    [SemanticResourceAttributes.HOST_ARCH]: HostArchValues.ARM32,
                }),
            );

            return true;
        });
    });

    it('should fall back to the original value for unknown architecure', () => {
        mockedArch.mockReturnValueOnce('s390');
        return osDetector.detect(config).then((resource) => {
            expect(resource).toHaveProperty(
                'attributes',
                expect.objectContaining({
                    [SemanticResourceAttributes.HOST_ARCH]: 's390',
                }),
            );

            return true;
        });
    });

    it('should prefer lookup table values for OS type', () => {
        mockedType.mockReturnValueOnce('Linux');
        return osDetector.detect(config).then((resource) => {
            expect(resource).toHaveProperty(
                'attributes',
                expect.objectContaining({
                    [SemanticResourceAttributes.OS_TYPE]: OsTypeValues.LINUX,
                }),
            );

            return true;
        });
    });

    it('should fall back to the original value for unknown OS type', () => {
        mockedType.mockReturnValueOnce('My Super OS!');
        return osDetector.detect(config).then((resource) => {
            expect(resource).toHaveProperty(
                'attributes',
                expect.objectContaining({
                    [SemanticResourceAttributes.OS_TYPE]: 'MYSUPEROS',
                }),
            );

            return true;
        });
    });
});
