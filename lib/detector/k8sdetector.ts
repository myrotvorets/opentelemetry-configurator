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
import debug from 'debug';
import { getContainerIDFormCGroup } from './utils';

const dbg = debug('otcfg');

class K8sDetector implements Detector {
    // eslint-disable-next-line class-methods-use-this
    public async detect(_config: ResourceDetectionConfigWithLogger): Promise<Resource> {
        const matches = /^(.*)-([a-f0-9]+)-([a-z0-9]{5})$/u.exec(process.env.HOSTNAME || '');
        if (!matches) {
            dbg('K8sDetector: not a k8s');
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

        const cleaned = K8sDetector.cleanUpAttributes(attrs);
        dbg('K8sDetector:', cleaned);
        return new Resource(cleaned);
    }

    private static getContainerID(): Promise<string> {
        return getContainerIDFormCGroup(/\/([0-9a-f]{12})[0-9a-f]{52}$/u);
    }

    // This method is internal to our configuration
    private static getUID(): Promise<string> {
        return K8sDetector.readFile('/etc/podinfo/uid');
    }

    // This method is internal to our configuration
    private static getNamespaceName(): Promise<string> {
        return K8sDetector.readFile('/etc/podinfo/namespace');
    }

    private static async readFile(name: string): Promise<string> {
        try {
            return (await promises.readFile(name, { encoding: 'ascii' })).trim();
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
