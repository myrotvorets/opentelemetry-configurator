import os from 'os';
import { ResourceDetectionConfig } from '@opentelemetry/resources';
import { HostArchValues, OsTypeValues, ResourceAttributes } from '@opentelemetry/semantic-conventions';
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
            expect(resource.attributes).toHaveProperty([ResourceAttributes.HOST_NAME]);
            expect(resource.attributes).toHaveProperty([ResourceAttributes.HOST_ARCH]);
            expect(resource.attributes).toHaveProperty([ResourceAttributes.OS_TYPE]);
            return true;
        });
    });

    it('should prefer lookup table values for architecure', () => {
        mockedArch.mockReturnValueOnce('arm');
        return osDetector.detect(config).then((resource) => {
            expect(resource).toHaveProperty(
                'attributes',
                expect.objectContaining({
                    [ResourceAttributes.HOST_ARCH]: HostArchValues.ARM32,
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
                    [ResourceAttributes.HOST_ARCH]: 's390',
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
                    [ResourceAttributes.OS_TYPE]: OsTypeValues.LINUX,
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
                    [ResourceAttributes.OS_TYPE]: 'MYSUPEROS',
                }),
            );

            return true;
        });
    });
});
