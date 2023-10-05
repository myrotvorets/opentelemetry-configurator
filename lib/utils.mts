import { Span, SpanStatusCode } from '@opentelemetry/api';

export function filterBlanksAndNulls(list: string[]): string[] {
    return list.map((item) => item.trim()).filter((s) => s !== 'null' && s !== '');
}

export function recordErrorToSpan(e: unknown, span: Span): Error {
    let err: Error;
    if (!(e instanceof Error)) {
        err = new Error(e?.toString());
    } else {
        err = e;
    }

    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR });
    return err;
}
