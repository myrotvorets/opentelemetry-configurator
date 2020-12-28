import { promises } from 'fs';
import {
    CONTAINER_RESOURCE,
    HOST_RESOURCE,
    K8S_RESOURCE,
    Resource,
    ResourceDetectionConfigWithLogger,
    SERVICE_RESOURCE,
} from '@opentelemetry/resources';
import { NoopLogger } from '@opentelemetry/api';
import { k8sDetector } from '../../lib/detector/k8sdetector';

const mockedReadFile = jest.spyOn(promises, 'readFile');

const config: ResourceDetectionConfigWithLogger = {
    logger: new NoopLogger(),
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
        return expect(k8sDetector.detect(config)).resolves.toBe(Resource.empty());
    });

    it('should properly extract information', () => {
        const expectedUID = '61c0b7d8-0195-4781-b469-ba9ccda365f7';
        const containerID = '524e03333ac128141df9cf0f8449c490e65c3fcf76878a60fe852c6003e7044c';
        const expectedCID = containerID.slice(0, 12);
        const expectedNS = 'default';
        const expectedPod = 'my-pod';
        const expectedDeployment = '9cb4c7c4b';
        const expectedHostname = `${expectedPod}-${expectedDeployment}-p2qbn`;

        mockedReadFile.mockImplementation(
            (path: Parameters<typeof promises.readFile>[0]): Promise<string> => {
                const fname = path as string;
                const lookup: Record<string, string> = {
                    '/proc/self/cgroup': `12:rdma:/\n12:cpuset:/kubepods/pod${expectedUID}/${containerID}`,
                    '/etc/podinfo/uid': expectedUID,
                    '/etc/podinfo/namespace': expectedNS,
                };

                return lookup[fname] ? Promise.resolve(lookup[fname]) : Promise.reject(new Error());
            },
        );

        process.env.HOSTNAME = expectedHostname;

        return k8sDetector.detect(config).then((resource) => {
            expect(resource).toHaveProperty('attributes', {
                [HOST_RESOURCE.NAME]: expectedHostname,
                [HOST_RESOURCE.ID]: expectedUID,
                [K8S_RESOURCE.POD_NAME]: expectedPod,
                [K8S_RESOURCE.DEPLOYMENT_NAME]: expectedDeployment,
                [K8S_RESOURCE.NAMESPACE_NAME]: expectedNS,
                [CONTAINER_RESOURCE.ID]: expectedCID,
                [SERVICE_RESOURCE.INSTANCE_ID]: expectedDeployment,
                [SERVICE_RESOURCE.NAMESPACE]: expectedNS,
            });
        });
    });

    it('should discard empty values', () => {
        const expectedPod = 'my-pod';
        const expectedDeployment = '9cb4c7c4b';
        const expectedHostname = `${expectedPod}-${expectedDeployment}-p2qbn`;

        mockedReadFile.mockRejectedValue(new Error());
        process.env.HOSTNAME = expectedHostname;

        return k8sDetector.detect(config).then((resource) => {
            expect(resource).toHaveProperty('attributes', {
                [HOST_RESOURCE.NAME]: expectedHostname,
                [K8S_RESOURCE.POD_NAME]: expectedPod,
                [K8S_RESOURCE.DEPLOYMENT_NAME]: expectedDeployment,
                [SERVICE_RESOURCE.INSTANCE_ID]: expectedDeployment,
            });
        });
    });
});
