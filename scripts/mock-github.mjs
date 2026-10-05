// Tiny in-memory stand-in for the parts of the GitHub REST API hiwo uses
// (repo info + contents). Used by `npm run e2e`; run alone with:
//   node scripts/mock-github.mjs   → http://127.0.0.1:4010
import http from "node:http";
import crypto from "node:crypto";

export function startMockGitHub({ port = 4010, repo = "illy/hiwo-daten", token = "test-token", isPrivate = true } = {}) {
  const files = new Map(); // path -> Buffer
  const stats = { puts: 0, conflicts: 0 };
  const gitSha = (buf) => crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Accept, Content-Type, X-GitHub-Api-Version",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  };
  const send = (res, status, body, type = "application/json") => {
    res.writeHead(status, { ...cors, "Content-Type": type });
    res.end(type === "application/json" ? JSON.stringify(body) : body);
  };

  const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") return send(res, 204, "", "text/plain");
    if (req.headers.authorization !== `Bearer ${token}`) return send(res, 401, { message: "Bad credentials" });
    const url = new URL(req.url, "http://x");
    const prefix = `/repos/${repo}`;
    if (!url.pathname.startsWith(prefix)) return send(res, 404, { message: "Not Found" });
    const rest = url.pathname.slice(prefix.length);

    if (rest === "" && req.method === "GET")
      return send(res, 200, { full_name: repo, private: isPrivate, default_branch: "main", permissions: { push: true } });

    if (!rest.startsWith("/contents/")) return send(res, 404, { message: "Not Found" });
    const path = rest.slice("/contents/".length).split("/").map(decodeURIComponent).join("/");
    const current = files.get(path);

    if (req.method === "GET") {
      if (!current) return send(res, 404, { message: "Not Found" });
      if ((req.headers.accept ?? "").includes("raw")) return send(res, 200, current, "application/octet-stream");
      return send(res, 200, { path, sha: gitSha(current), encoding: "base64", content: current.toString("base64") });
    }

    let body = "";
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body || "{}");

    if (req.method === "PUT") {
      stats.puts++;
      if (current && data.sha !== gitSha(current)) {
        stats.conflicts++;
        return send(res, 409, { message: `${path} does not match ${data.sha}` });
      }
      if (!current && data.sha) return send(res, 422, { message: "sha given for a new file" });
      const buf = Buffer.from(data.content, "base64");
      files.set(path, buf);
      return send(res, current ? 200 : 201, { content: { path, sha: gitSha(buf) } });
    }
    if (req.method === "DELETE") {
      if (!current) return send(res, 404, { message: "Not Found" });
      if (data.sha !== gitSha(current)) return send(res, 409, { message: "sha mismatch" });
      files.delete(path);
      return send(res, 200, { content: null });
    }
    send(res, 405, { message: "Method not allowed" });
  });

  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve({ files, stats, close: () => server.close() })),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startMockGitHub();
  console.log("mock GitHub API on http://127.0.0.1:4010 (repo illy/hiwo-daten, token test-token)");
}
