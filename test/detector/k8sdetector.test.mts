import { afterEach, before, describe, it } from 'mocha';
import { expect } from 'chai';
import * as td from 'testdouble';
import type { ResourceDetectionConfig } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import type { K8sDetector } from '../../lib/detector/k8sdetector.mjs';
import { runDetector } from './helpers.mjs';

describe('K8sDetector', () => {
    const env = { ...process.env } as const;
    let k8sDetector: K8sDetector;

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

        ({ k8sDetector } = await import('../../lib/detector/k8sdetector.mjs'));
        config.detectors = [k8sDetector];
    });

    afterEach(() => {
        process.env = { ...env };
    });

    it('should return an empty resource if this is not a K8S', () => {
        process.env.HOSTNAME = '';
        return expect(runDetector(k8sDetector, config))
            .to.eventually.be.an('object')
            .and.have.deep.property('attributes', {});
    });

    it('should properly extract information', () => {
        const expectedUID = '61c0b7d8-0195-4781-b469-ba9ccda365f7';
        const containerID = '524e03333ac128141df9cf0f8449c490e65c3fcf76878a60fe852c6003e7044c';
        const expectedCID = containerID.slice(0, 12);
        const expectedNS = 'default';
        const expectedPod = 'my-pod';
        const expectedDeployment = '9cb4c7c4b';
        const expectedHostname = `${expectedPod}-${expectedDeployment}-p2qbn`;

        td.when(readFileMock(td.matchers.isA(String), td.matchers.anything())).thenDo(
            (path: string): Promise<string> => {
                const lookup: Record<string, string> = {
                    '/proc/self/cgroup': `12:rdma:/\n12:cpuset:/kubepods/pod${expectedUID}/${containerID}`,
                    '/etc/podinfo/uid': expectedUID,
                    '/etc/podinfo/namespace': expectedNS,
                };

                return lookup[path] ? Promise.resolve(lookup[path]) : Promise.reject(new Error());
            },
        );

        process.env.HOSTNAME = expectedHostname;

        return expect(runDetector(k8sDetector, config))
            .to.eventually.be.an('object')
            .and.have.deep.property('attributes', {
                [SemanticResourceAttributes.HOST_NAME]: expectedHostname,
                [SemanticResourceAttributes.HOST_ID]: expectedUID,
                [SemanticResourceAttributes.K8S_POD_NAME]: expectedPod,
                [SemanticResourceAttributes.K8S_DEPLOYMENT_NAME]: expectedDeployment,
                [SemanticResourceAttributes.K8S_NAMESPACE_NAME]: expectedNS,
                [SemanticResourceAttributes.CONTAINER_ID]: expectedCID,
            });
    });

    it('should discard empty values', () => {
        const expectedPod = 'my-pod';
        const expectedDeployment = '9cb4c7c4b';
        const expectedHostname = `${expectedPod}-${expectedDeployment}-p2qbn`;

        td.when(readFileMock(td.matchers.isA(String), td.matchers.anything())).thenReject(new Error());
        process.env.HOSTNAME = expectedHostname;

        return expect(runDetector(k8sDetector, config))
            .to.eventually.be.an('object')
            .and.have.deep.property('attributes', {
                [SemanticResourceAttributes.HOST_NAME]: expectedHostname,
                [SemanticResourceAttributes.K8S_POD_NAME]: expectedPod,
                [SemanticResourceAttributes.K8S_DEPLOYMENT_NAME]: expectedDeployment,
            });
    });
});
