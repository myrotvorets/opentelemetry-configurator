import { hostname } from 'os';
import { promises } from 'fs';
import {
    CONTAINER_RESOURCE,
    Detector,
    HOST_RESOURCE,
    Resource,
    ResourceDetectionConfigWithLogger,
} from '@opentelemetry/resources';

class DockerDetector implements Detector {
    // eslint-disable-next-line class-methods-use-this
    public async detect(_config: ResourceDetectionConfigWithLogger): Promise<Resource> {
        const cid = await DockerDetector.getContainerID();
        if (cid) {
            return new Resource({
                [HOST_RESOURCE.NAME]: process.env.HOSTNAME || hostname(),
                [CONTAINER_RESOURCE.ID]: cid,
            });
        }

        return Resource.empty();
    }

    private static async getContainerID(): Promise<string> {
        try {
            const raw = await promises.readFile('/proc/self/cgroup', { encoding: 'ascii' });
            const lines = raw.trim().split('\n');
            for (const line of lines) {
                if (/\/docker\/[0-9a-f]{64}$/u.test(line)) {
                    return line.slice(-64, -52);
                }
            }
        } catch (e) {
            // Do nothing
        }

        return '';
    }
}

export const dockerDetector: Detector = new DockerDetector();
