import { promises } from 'node:fs';
import { ResourceDetectionConfig } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { dockerDetector } from '../../lib/detector/dockerdetector';
import { runDetector } from './helpers';

const mockedReadFile = jest.spyOn(promises, 'readFile');

const config: ResourceDetectionConfig = {
    detectors: [dockerDetector],
};

const env = { ...process.env };

describe('DockerDetector', () => {
    afterEach(() => {
        process.env = { ...env };
    });

    it('should return an empty resource when /proc/self/cgroup is not readable', () => {
        mockedReadFile.mockRejectedValueOnce(new Error());
        return expect(runDetector(dockerDetector, config)).resolves.toHaveProperty('attributes', {});
    });

    it('should return an empty resource if this is not a Docker', () => {
        mockedReadFile.mockResolvedValueOnce('');
        return expect(runDetector(dockerDetector, config)).resolves.toHaveProperty('attributes', {});
    });

    it('should extract container ID from /proc/self/cgroup', () => {
        const containerID = 'ec476b266b2148cb1adc1ca6399f9cffc1c28b24e68d6d68c50db7e981d2ae1d';
        const expectedID = containerID.slice(0, 12);

        mockedReadFile.mockResolvedValueOnce(`11:cpu,cpuacct:/docker/${containerID}\n`);

        return expect(runDetector(dockerDetector, config)).resolves.toHaveProperty('attributes', {
            [SemanticResourceAttributes.CONTAINER_ID]: expectedID,
        });
    });
});
