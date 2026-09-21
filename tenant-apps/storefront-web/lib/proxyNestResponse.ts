/** Forward Nest JSON body + status to the browser from Route Handlers. */
export async function proxyNestResponse(res: Response): Promise<Response> {
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
