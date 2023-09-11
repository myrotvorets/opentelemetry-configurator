import {
    DetectorSync,
    IResource,
    Resource,
    ResourceAttributes,
    ResourceDetectionConfig,
} from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getContainerIDFormCGroup } from './utils';

class DockerDetector implements DetectorSync {
    // eslint-disable-next-line class-methods-use-this
    public detect(_config: ResourceDetectionConfig): IResource {
        return new Resource({}, DockerDetector.getAsyncAttributes());
    }

    private static async getAsyncAttributes(): Promise<ResourceAttributes> {
        const cid = await DockerDetector.getContainerID();
        if (cid) {
            return {
                [SemanticResourceAttributes.CONTAINER_ID]: cid,
            };
        }

        return {};
    }

    private static getContainerID(): Promise<string> {
        return getContainerIDFormCGroup(/\/docker\/([0-9a-f]{12})[0-9a-f]{52}$/u);
    }
}

export const dockerDetector = new DockerDetector();
