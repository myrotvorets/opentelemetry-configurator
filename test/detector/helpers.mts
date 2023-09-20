import type { DetectorSync, Resource, ResourceDetectionConfig } from '@opentelemetry/resources';

export async function runDetector(detector: DetectorSync, config: ResourceDetectionConfig): Promise<Resource> {
    const resource = detector.detect(config);
    if (resource.waitForAsyncAttributes) {
        await resource.waitForAsyncAttributes();
    }

    return resource;
}
