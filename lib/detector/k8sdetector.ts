import { promises } from 'fs';
import {
    CONTAINER_RESOURCE,
    Detector,
    HOST_RESOURCE,
    K8S_RESOURCE,
    Resource,
    ResourceAttributes,
    ResourceDetectionConfigWithLogger,
    SERVICE_RESOURCE,
} from '@opentelemetry/resources';

class K8sDetector implements Detector {
    // eslint-disable-next-line class-methods-use-this
    public async detect(_config: ResourceDetectionConfigWithLogger): Promise<Resource> {
        const matches = /^(.*)-([a-f0-9]+)-([a-z0-9]{5})$/u.exec(process.env.HOSTNAME || '');
        if (!matches) {
            return Resource.empty();
        }

        const [uid, cid, ns] = await Promise.all([
            K8sDetector.getUID(),
            K8sDetector.getContainerID(),
            K8sDetector.getNamespaceName(),
        ]);

        const attrs: ResourceAttributes = {
            [HOST_RESOURCE.NAME]: process.env.HOSTNAME as string,
            [HOST_RESOURCE.ID]: uid,
            [K8S_RESOURCE.POD_NAME]: matches[1],
            [K8S_RESOURCE.DEPLOYMENT_NAME]: matches[2],
            [K8S_RESOURCE.NAMESPACE_NAME]: ns,
            [CONTAINER_RESOURCE.ID]: cid,
            [SERVICE_RESOURCE.INSTANCE_ID]: matches[2],
            [SERVICE_RESOURCE.NAMESPACE]: ns,
        };

        return new Resource(K8sDetector.cleanUpAttributes(attrs));
    }

    private static async getContainerID(): Promise<string> {
        try {
            const raw = await promises.readFile('/proc/self/cgroup', { encoding: 'ascii' });
            const lines = raw.trim().split('\n');
            for (const line of lines) {
                if (/\/[0-9a-f]{64}$/u.test(line)) {
                    return line.slice(-64, -52);
                }
            }
        } catch (e) {
            // Do nothing
        }

        return '';
    }

    // This method is internal to our configuration
    private static async getUID(): Promise<string> {
        try {
            return (await promises.readFile('/etc/podinfo/uid', { encoding: 'ascii' })).trim();
        } catch (e) {
            return '';
        }
    }

    // This method is internal to our configuration
    private static async getNamespaceName(): Promise<string> {
        try {
            return (await promises.readFile('/etc/podinfo/namespace', { encoding: 'ascii' })).trim();
        } catch (e) {
            return '';
        }
    }

    private static cleanUpAttributes(attrs: ResourceAttributes): ResourceAttributes {
        const result: ResourceAttributes = {};
        Object.keys(attrs).forEach((key) => {
            const value = attrs[key];
            if (value) {
                result[key] = value;
            }
        });

        return result;
    }
}

export const k8sDetector: Detector = new K8sDetector();
