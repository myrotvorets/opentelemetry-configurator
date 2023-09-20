import { afterEach, before, describe, it } from 'mocha';
import { expect } from 'chai';
import * as td from 'testdouble';
import type { ResourceDetectionConfig } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import type { DockerDetector } from '../../lib/detector/dockerdetector.mjs';
import { runDetector } from './helpers.mjs';

describe('DockerDetector', () => {
    const env = { ...process.env } as const;
    let dockerDetector: DockerDetector;

    const config: ResourceDetectionConfig = {
        detectors: [],
    };

    const readFileMock = td.function();

    before(async () => {
        const promises = await import('node:fs/promises');
        await td.replaceEsm('node:fs/promises', {
            ...promises,
            readFile: readFileMock,
        });

        ({ dockerDetector } = await import('../../lib/detector/dockerdetector.mjs'));
        config.detectors = [dockerDetector];
    });

    afterEach(() => {
        process.env = { ...env };
    });

    it('should return an empty resource when /proc/self/cgroup is not readable', () => {
        td.when(readFileMock('/proc/self/cgroup', { encoding: 'ascii' })).thenReject(new Error());
        return expect(runDetector(dockerDetector, config))
            .to.eventually.be.an('object')
            .and.have.deep.property('attributes', {});
    });

    it('should return an empty resource if this is not a Docker', () => {
        td.when(readFileMock('/proc/self/cgroup', { encoding: 'ascii' })).thenResolve('');
        return expect(runDetector(dockerDetector, config))
            .to.eventually.be.an('object')
            .and.have.deep.property('attributes', {});
    });

    it('should extract container ID from /proc/self/cgroup', () => {
        const containerID = 'ec476b266b2148cb1adc1ca6399f9cffc1c28b24e68d6d68c50db7e981d2ae1d';
        const expectedID = containerID.slice(0, 12);

        td.when(readFileMock('/proc/self/cgroup', { encoding: 'ascii' })).thenResolve(
            `11:cpu,cpuacct:/docker/${containerID}\n`,
        );

        return expect(runDetector(dockerDetector, config))
            .to.eventually.be.an('object')
            .and.have.deep.property('attributes', {
                [SemanticResourceAttributes.CONTAINER_ID]: expectedID,
            });
    });
});
