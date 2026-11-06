/**
 * Result of a scoring-pipeline step. Expected failures (missing fixture, no stats yet) come back
 * as { ok: false } with the HTTP status a route should use; unexpected errors are thrown.
 */
export type PipelineResult<T extends object = object> =
    | ({ ok: true } & T)
    | { ok: false; status: number; error: string }
