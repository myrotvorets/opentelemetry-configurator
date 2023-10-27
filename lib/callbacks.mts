import type { ClientRequest, IncomingMessage } from 'node:http';
import { SpanKind } from '@opentelemetry/api';
import type { HttpCustomAttributeFunction } from '@opentelemetry/instrumentation-http';
import type { EndHook } from '@opentelemetry/instrumentation-fs';

export const http_applyCustomAttributesOnSpan: HttpCustomAttributeFunction = (span, request) => {
    if ('kind' in span && typeof request.method === 'string') {
        if (span.kind === SpanKind.SERVER) {
            const req = request as IncomingMessage;
            if ('originalUrl' in req && typeof req.originalUrl === 'string') {
                span.updateName(`${req.method} ${req.originalUrl}`);
            } else {
                span.updateName(`${req.method} ${req.url}`);
            }
        } else if (span.kind === SpanKind.CLIENT) {
            const req = request as ClientRequest;
            span.updateName(`${req.method} ${req.path}`);
        }
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
