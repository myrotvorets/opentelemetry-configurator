import { before, describe, it } from 'mocha';
import { expect } from 'chai';
import * as td from 'testdouble';
import type { ResourceDetectionConfig } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import type { PackageJsonDetector } from '../../lib/detector/packagejsondetector.mjs';
import { runDetector } from './helpers.mjs';

describe('PackageJsonDetector', () => {
    let packageJsonDetector: PackageJsonDetector;

    const config: ResourceDetectionConfig = {
        detectors: [],
    };

    const readFileMock = td.function();
    const statMock = td.function();

    before(async () => {
        const promises = await import('node:fs/promises');
        await td.replaceEsm('node:fs/promises', {
            ...promises,
            readFile: readFileMock,
            stat: statMock,
        });

        ({ packageJsonDetector } = await import('../../lib/detector/packagejsondetector.mjs'));
        config.detectors = [packageJsonDetector];
    });

    it('should return an empty resource when package.json cannot be located', () => {
        td.when(statMock(td.matchers.isA(String))).thenReject(new Error());

        return expect(runDetector(packageJsonDetector, config))
            .to.eventually.be.an('object')
            .and.have.deep.property('attributes', {});
    });

    it('should retrieve name and version from package.json', () => {
        const obj = { name: 'Package Name', version: '1.2.3' };

        td.when(statMock(td.matchers.isA(String))).thenResolve({ isFile: () => true });
        td.when(readFileMock(td.matchers.isA(String), { encoding: 'utf-8' })).thenResolve(JSON.stringify(obj));

        return expect(runDetector(packageJsonDetector, config))
            .to.eventually.be.an('object')
            .and.have.deep.property('attributes', {
                [SemanticResourceAttributes.SERVICE_NAME]: obj.name,
                [SemanticResourceAttributes.SERVICE_VERSION]: obj.version,
            });
    });
});
