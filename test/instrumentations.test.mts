import { describe, it } from 'node:test';
import { expect } from 'chai';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { getExpressInstrumentations, getFsInstrumentation } from '../lib/instrumentations.mjs';

import './setup.mjs';

await describe('instrumentations', async function () {
    await describe('getFsInstrumentation', async function () {
        await it('should return an instance of FsInstrumentation', function () {
            const fsInstrumentation = getFsInstrumentation(true);
            expect(fsInstrumentation).to.be.an.instanceOf(FsInstrumentation);
        });
    });

    await describe('getExpressInstrumentations', async function () {
        await it('should return an array of ExpressInstrumentation and HttpInstrumentation', function () {
            const expressInstrumentations = getExpressInstrumentations();
            expect(expressInstrumentations)
                .to.be.an('array')
                .that.has.lengthOf(2)
                .and.includes.something.that.is.an.instanceOf(ExpressInstrumentation)
                .and.includes.something.that.is.an.instanceOf(HttpInstrumentation);
        });
    });
});
