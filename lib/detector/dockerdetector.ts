import { Detector, Resource, ResourceDetectionConfig } from '@opentelemetry/resources';
import { ResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getContainerIDFormCGroup } from './utils';

class DockerDetector implements Detector {
    // eslint-disable-next-line class-methods-use-this
    public async detect(_config: ResourceDetectionConfig): Promise<Resource> {
        const cid = await DockerDetector.getContainerID();
        if (cid) {
            const attrs = {
                [ResourceAttributes.CONTAINER_ID]: cid,
            };

            return new Resource(attrs);
        }

        return Resource.empty();
    }

    private static getContainerID(): Promise<string> {
        return getContainerIDFormCGroup(/\/docker\/([0-9a-f]{12})[0-9a-f]{52}$/u);
    }
}

export const dockerDetector: Detector = new DockerDetector();
