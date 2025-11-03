// Netlify scheduled function to ping the backend periodically and prevent cold starts
// Docs: https://docs.netlify.com/functions/scheduled-functions/

export const config = {
  schedule: "@every 5m",
};

export default async function handler() {
  const backend = process.env["BACKEND_URL"] || "https://backend-club-taekwondo.onrender.com";
  const url = `${backend.replace(/\/$/, "")}/api/clubs`;

  try {
    const res = await fetch(url);
    const ok = res?.ok;
    const status = res?.status;
    return new Response(
      JSON.stringify({ ok, status, url }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err), url }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }
}
