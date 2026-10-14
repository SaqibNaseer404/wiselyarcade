// wiselyarcade.com edge middleware:
// 1. 301 www.wiselyarcade.com -> wiselyarcade.com (canonical host)
// 2. Add Link: rel=canonical response header on HTML pages
//    (the game pages currently ship without canonical tags)
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'www.wiselyarcade.com') {
    url.hostname = 'wiselyarcade.com';
    return Response.redirect(url.toString(), 301);
  }
  const res = await context.next();
  const ct = res.headers.get('content-type') || '';
  if (res.status === 200 && ct.includes('text/html')) {
    const headers = new Headers(res.headers);
    headers.set('Link', `<https://wiselyarcade.com${url.pathname}>; rel="canonical"`);
    return new Response(res.body, { status: res.status, headers });
  }
  return res;
}
