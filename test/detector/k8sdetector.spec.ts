import { promises } from 'node:fs';
import { ResourceDetectionConfig } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { k8sDetector } from '../../lib/detector/k8sdetector';
import { runDetector } from './helpers';

const mockedReadFile = jest.spyOn(promises, 'readFile');

const config: ResourceDetectionConfig = {
    detectors: [k8sDetector],
};

const env = { ...process.env };

afterEach(() => jest.resetAllMocks());

describe('PackageJsonDetector', () => {
    afterEach(() => {
        process.env = { ...env };
    });

    it('should return an empty resource if this is not a K8S', () => {
        process.env.HOSTNAME = '';
        return expect(runDetector(k8sDetector, config)).resolves.toHaveProperty('attributes', {});
    });

    it('should properly extract information', () => {
        const expectedUID = '61c0b7d8-0195-4781-b469-ba9ccda365f7';
        const containerID = '524e03333ac128141df9cf0f8449c490e65c3fcf76878a60fe852c6003e7044c';
        const expectedCID = containerID.slice(0, 12);
        const expectedNS = 'default';
        const expectedPod = 'my-pod';
        const expectedDeployment = '9cb4c7c4b';
        const expectedHostname = `${expectedPod}-${expectedDeployment}-p2qbn`;

        mockedReadFile.mockImplementation((path: Parameters<typeof promises.readFile>[0]): Promise<string> => {
            const fname = path as string;
            const lookup: Record<string, string> = {
                '/proc/self/cgroup': `12:rdma:/\n12:cpuset:/kubepods/pod${expectedUID}/${containerID}`,
                '/etc/podinfo/uid': expectedUID,
                '/etc/podinfo/namespace': expectedNS,
            };

            return lookup[fname] ? Promise.resolve(lookup[fname]) : Promise.reject(new Error());
        });

        process.env.HOSTNAME = expectedHostname;

        return expect(runDetector(k8sDetector, config)).resolves.toHaveProperty('attributes', {
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

        mockedReadFile.mockRejectedValue(new Error());
        process.env.HOSTNAME = expectedHostname;

        return expect(runDetector(k8sDetector, config)).resolves.toHaveProperty('attributes', {
            [SemanticResourceAttributes.HOST_NAME]: expectedHostname,
            [SemanticResourceAttributes.K8S_POD_NAME]: expectedPod,
            [SemanticResourceAttributes.K8S_DEPLOYMENT_NAME]: expectedDeployment,
        });
    });
});
