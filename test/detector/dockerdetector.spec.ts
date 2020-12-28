import { promises } from 'fs';
import os from 'os';
import {
    CONTAINER_RESOURCE,
    HOST_RESOURCE,
    Resource,
    ResourceDetectionConfigWithLogger,
} from '@opentelemetry/resources';
import { NoopLogger } from '@opentelemetry/api';
import { dockerDetector } from '../../lib/detector/dockerdetector';

const mockedReadFile = jest.spyOn(promises, 'readFile');

const config: ResourceDetectionConfigWithLogger = {
    logger: new NoopLogger(),
    detectors: [dockerDetector],
};

const env = { ...process.env };

function checkResource(resource: Resource, expectedID: string, expectedHostname: string): void {
    expect(resource).toHaveProperty('attributes', expect.any(Object));
    expect(resource.attributes).toHaveProperty([CONTAINER_RESOURCE.ID], expectedID);
    expect(resource.attributes).toHaveProperty([HOST_RESOURCE.NAME], expectedHostname);
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
