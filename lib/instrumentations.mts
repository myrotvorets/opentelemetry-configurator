import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import { fs_endHook, fs_endHook_updateName, http_applyCustomAttributesOnSpan } from './callbacks.mjs';

export function getFsInstrumentation(addFilenameToSpanName: boolean): FsInstrumentation {
    return new FsInstrumentation({
        requireParentSpan: true,
        endHook: addFilenameToSpanName ? fs_endHook_updateName /* c8 ignore next */ : fs_endHook,
    });
}

export function getExpressInstrumentations(): Instrumentation[] {
    return [
        new HttpInstrumentation({
            applyCustomAttributesOnSpan: http_applyCustomAttributesOnSpan,
        }),
        new ExpressInstrumentation(),
    ];
}
