export async function withSpan<T>(
  _name: string,
  fn: () => Promise<T>,
  _attributes?: Record<string, string | number | boolean>
): Promise<T> {
  // Tracing is deliberately an optional adapter. Keeping the hot path dependency-free
  // avoids bundling every OpenTelemetry provider into the research runtime.
  return fn()
}
