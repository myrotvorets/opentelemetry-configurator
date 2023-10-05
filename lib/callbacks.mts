import { SpanKind } from '@opentelemetry/api';
import type { HttpCustomAttributeFunction } from '@opentelemetry/instrumentation-http';
import type { EndHook } from '@opentelemetry/instrumentation-fs';

export const http_applyCustomAttributesOnSpan: HttpCustomAttributeFunction = (span, request) => {
    if (
        'kind' in span &&
        span.kind === SpanKind.SERVER &&
        'url' in request &&
        typeof request.url === 'string' &&
        typeof request.method === 'string'
    ) {
        span.updateName(`${request.method} ${request.url}`);
    }
};

export const fs_endHook: EndHook = (_name, info) => {
    if (typeof info.args[0] === 'string') {
        info.span.setAttribute('fs.path', info.args[0]);
    }
};

export const fs_endHook_updateName: EndHook = (_name, info) => {
    if (typeof info.args[0] === 'string') {
        info.span.setAttribute('fs.path', info.args[0]);
        if ('name' in info.span && typeof info.span.name === 'string') {
            info.span.updateName(`${info.span.name} - ${info.args[0]}`);
        }
    }
};
