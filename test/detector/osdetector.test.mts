import { before, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import * as td from 'testdouble';
import type { ResourceDetectionConfig } from '@opentelemetry/resources';
import { HostArchValues, OsTypeValues, SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import type { OSDetector } from '../../lib/detector/osdetector.mjs';

describe('OSDetector', () => {
    let osDetector: OSDetector;

    const config: ResourceDetectionConfig = {
        detectors: [],
    };

    const archMock = td.function();
    const typeMock = td.function();
    let osArch: string;
    let osType: string;

    before(async () => {
        const os = await import('os');
        await td.replaceEsm('os', {
            ...os,
            arch: archMock,
            type: typeMock,
        });

        osArch = os.arch();
        osType = os.type();

        ({ osDetector } = await import('../../lib/detector/osdetector.mjs'));
        config.detectors = [osDetector];
    });

    beforeEach(() => {
        td.when(archMock()).thenReturn(osArch);
        td.when(typeMock()).thenReturn(osType);
    });

    it('should retrieve host name, architecture and OS type', () => {
        const resource = osDetector.detect(config);
        expect(resource)
            .to.be.an('object')
            .and.have.property('attributes')
            .that.is.an('object')
            .and.has.keys([
                SemanticResourceAttributes.HOST_NAME,
                SemanticResourceAttributes.HOST_ARCH,
                SemanticResourceAttributes.OS_TYPE,
            ]);
    });

    it('should prefer lookup table values for architecure', () => {
        td.when(archMock()).thenReturn('arm');

        const resource = osDetector.detect(config);
        expect(resource)
            .to.be.an('object')
            .and.have.property('attributes')
            .that.is.an('object')
            .and.has.property(SemanticResourceAttributes.HOST_ARCH, HostArchValues.ARM32);
    });

    it('should fall back to the original value for unknown architecure', () => {
        const expected = 's390';
        td.when(archMock()).thenReturn(expected);

        const resource = osDetector.detect(config);
        expect(resource)
            .to.be.an('object')
            .and.have.property('attributes')
            .that.is.an('object')
            .and.has.property(SemanticResourceAttributes.HOST_ARCH, expected);
    });

    it('should prefer lookup table values for OS type', () => {
        td.when(typeMock()).thenReturn('Linux');

        const resource = osDetector.detect(config);
        expect(resource)
            .to.be.an('object')
            .and.have.property('attributes')
            .that.is.an('object')
            .and.has.property(SemanticResourceAttributes.OS_TYPE, OsTypeValues.LINUX);
    });

    it('should fall back to the original value for unknown OS type', () => {
        td.when(typeMock()).thenReturn('My Super OS!');

        const resource = osDetector.detect(config);
        expect(resource)
            .to.be.an('object')
            .and.have.property('attributes')
            .that.is.an('object')
            .and.has.property(SemanticResourceAttributes.OS_TYPE, 'MYSUPEROS');
    });
});
