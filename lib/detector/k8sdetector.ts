import { promises } from 'fs';
import { Detector, Resource, ResourceAttributes, ResourceDetectionConfig } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getContainerIDFormCGroup } from './utils';

class K8sDetector implements Detector {
    // eslint-disable-next-line class-methods-use-this
    public async detect(_config: ResourceDetectionConfig): Promise<Resource> {
        const matches = /^(.*)-([a-f0-9]+)-([a-z0-9]{5})$/u.exec(process.env.HOSTNAME || '');
        if (!matches) {
            return Resource.empty();
        }

        const [uid, cid, ns] = await Promise.all([
            K8sDetector.getUID(),
            K8sDetector.getContainerID(),
            K8sDetector.getNamespaceName(),
        ]);

        const attrs = {
            [SemanticResourceAttributes.HOST_NAME]: process.env.HOSTNAME as string,
            [SemanticResourceAttributes.HOST_ID]: uid,
            [SemanticResourceAttributes.K8S_POD_NAME]: matches[1],
            [SemanticResourceAttributes.K8S_DEPLOYMENT_NAME]: matches[2],
            [SemanticResourceAttributes.K8S_NAMESPACE_NAME]: ns,
            [SemanticResourceAttributes.CONTAINER_ID]: cid,
        };

        const cleaned = K8sDetector.cleanUpAttributes(attrs);
        return new Resource(cleaned);
    }

    private static getContainerID(): Promise<string> {
        return getContainerIDFormCGroup(/\/([0-9a-f]{12})[0-9a-f]{52}$/u);
    }

    // This method is specific to our configuration
    private static getUID(): Promise<string> {
        return K8sDetector.readFile('/etc/podinfo/uid');
    }

    // This method is specific to our configuration
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
