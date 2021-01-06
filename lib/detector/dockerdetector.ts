import { hostname } from 'os';
import {
    CONTAINER_RESOURCE,
    Detector,
    HOST_RESOURCE,
    Resource,
    ResourceDetectionConfigWithLogger,
} from '@opentelemetry/resources';
import debug from 'debug';
import { getContainerIDFormCGroup } from './utils';

const dbg = debug('otcfg');

class DockerDetector implements Detector {
    // eslint-disable-next-line class-methods-use-this
    public async detect(_config: ResourceDetectionConfigWithLogger): Promise<Resource> {
        const cid = await DockerDetector.getContainerID();
        if (cid) {
            const attrs = {
                [HOST_RESOURCE.NAME]: process.env.HOSTNAME || hostname(),
                [CONTAINER_RESOURCE.ID]: cid,
            };

            dbg('DockerDetector:', attrs);
            return new Resource(attrs);
        }

        dbg('DockerDetector: not a Docker');
        return Resource.empty();
    }

    private static getContainerID(): Promise<string> {
        return getContainerIDFormCGroup(/\/docker\/([0-9a-f]{12})[0-9a-f]{52}$/u);
    }
}

export const dockerDetector: Detector = new DockerDetector();
