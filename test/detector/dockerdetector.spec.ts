import { promises } from 'fs';
import os from 'os';
import { Resource, ResourceDetectionConfig } from '@opentelemetry/resources';
import { ResourceAttributes } from '@opentelemetry/semantic-conventions';
import { dockerDetector } from '../../lib/detector/dockerdetector';

const mockedReadFile = jest.spyOn(promises, 'readFile');

const config: ResourceDetectionConfig = {
    detectors: [dockerDetector],
};

const env = { ...process.env };

function checkResource(resource: Resource, expectedID: string, expectedHostname: string): void {
    expect(resource).toHaveProperty('attributes', expect.any(Object));
    expect(resource.attributes).toHaveProperty([ResourceAttributes.CONTAINER_ID], expectedID);
    expect(resource.attributes).toHaveProperty([ResourceAttributes.HOST_NAME], expectedHostname);
    expect(resource.attributes).toHaveProperty([ResourceAttributes.HOST_ARCH], os.arch());
    expect(resource.attributes).toHaveProperty([ResourceAttributes.OS_TYPE], os.type());
}

describe('PackageJsonDetector', () => {
    afterEach(() => {
        process.env = { ...env };
    });

    it('should return an empty resource when /proc/self/cgroup is not readable', () => {
        mockedReadFile.mockRejectedValueOnce(new Error());
        return expect(dockerDetector.detect(config)).resolves.toBe(Resource.empty());
    });

    it('should return an empty resource if this is not a Docker', () => {
        mockedReadFile.mockResolvedValueOnce('');
        return expect(dockerDetector.detect(config)).resolves.toBe(Resource.empty());
    });

    it('should extract container ID from /proc/self/cgroup', () => {
        const containerID = 'ec476b266b2148cb1adc1ca6399f9cffc1c28b24e68d6d68c50db7e981d2ae1d';
        const expectedID = containerID.slice(0, 12);
        const expectedHostname = 'nostalgia-for-infinity';

        process.env.HOSTNAME = expectedHostname;
        mockedReadFile.mockResolvedValueOnce(`11:cpu,cpuacct:/docker/${containerID}\n`);

        return dockerDetector.detect(config).then((resource) => checkResource(resource, expectedID, expectedHostname));
    });

    it('should should fall back to os.hostname()', () => {
        const containerID = 'ec476b266b2148cb1adc1ca6399f9cffc1c28b24e68d6d68c50db7e981d2ae1d';
        const expectedID = containerID.slice(0, 12);
        const expectedHostname = 'democratic-circus';

        process.env.HOSTNAME = '';
        mockedReadFile.mockResolvedValueOnce(`11:cpu,cpuacct:/docker/${containerID}\n`);
        os.hostname = jest.fn().mockReturnValueOnce(expectedHostname);

        return dockerDetector.detect(config).then((resource) => checkResource(resource, expectedID, expectedHostname));
    });
});
