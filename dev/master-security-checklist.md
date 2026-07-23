# Master Security Checklist

> **Purpose:** Universal security standard for every project and website Qera ships. The single source of truth for top-agency-grade application security. Built on OWASP ASVS, OWASP Top 10 (2021), OWASP API Security Top 10 (2023), and modern platform best practice — translated into Qera's stack and format. If every item at the project's tier is checked and verified, the build clears the bar that 95% of agency work silently fails.
>
> **Status:** v1.2 — compiled from OWASP ASVS 4.0, OWASP Top 10 2021, OWASP API Security Top 10 2023, OWASP Cheat Sheet Series, Mozilla web security guidelines, and multi-domain synthesis. v1.1 added the **Master-Doc Precedence Protocol** and the **Enterprise Security Architecture — Consultant Layer**. **v1.2 (checklist-review rev): §4 +SSTI +ReDoS; §5 +clipboard/pastejacking; §9 +named replay-attack defence; §11 reframed as layered defence-in-depth +identity-based/distributed/behavioural rate limiting +application-layer/algorithmic DoS; §3 CORS browser-only nuance.** Living document — review quarterly (see Maintenance → Quarterly).
>
> **THE ONE RULE THAT PREVENTS MOST BREACHES:**
> **Never trust the client. Never expose internal IDs. Always verify ownership server-side.**
> The cafe-QR bug (change the table number in the URL, order for someone else's table) is a textbook **IDOR / Broken Object Level Authorization** failure — the #1 web vulnerability by real-world impact. It is caught by a single item in Section 3. If you only ever enforce one section, enforce that one.

---

## How security tiering differs from SEO tiering — read this first

SEO is **additive**: skip a Premium item, you lose some CTR. Security is **weakest-link**: skip one Floor item and the breach doesn't care that everything else was perfect. So the tier model is inverted.

> **Tier tags (on every item):**
> - `[Floor]` — **non-negotiable. Every project, every client, every budget — including the ₹20k Framer site.** Without these the build is exploitable by a teenager with browser DevTools. There is no "we skipped it because the client was cheap" defence for a Floor item; that sentence is a liability in writing. ~Bundled into base build cost, not a line item.
> - `[L2]` — **applications handling personal or sensitive data** (logins, user accounts, PII, contact form data stored in a DB, dashboards). This is *most* real client work. Adds depth: monitoring, hardening, validation rigor. · **+8–16 hrs** · charge as "Security Hardening"
> - `[L3]` — **critical applications**: payments, health data, financial data, anything where a breach is existential or regulated. High-value attack targets. · **+20–40 hrs** · charge as "Security Audit & Hardening" or scope a dedicated engagement
>
> Tiers reflect **data sensitivity and blast radius, not client budget.** A cheap client processing payments still needs L3 on the payment path. If they won't pay for it, you decline the payment feature — you do not ship L3 functionality at Floor protection.

> **Verification:** Security items carry an explicit **Verify:** note where "I did it" needs proof. An unverified security checklist is theatre. Tooling referenced is consolidated in **Notes → Verification Toolbox**.

> **Stack addendums** (applied on top of the universal checklist — see Stack Addendums section):
> - `[NextJS/Vercel]` — custom Next.js builds on Vercel
> - `[Supabase]` — Supabase backend (RLS is the whole game here)
> - `[Managed]` — Framer / Webflow / Wix; most infra is platform-handled, the threat surface shifts to embeds, forms, and integrations
> - `[Automation]` — n8n / Make / Zapier workflows and webhooks; the quiet disaster zone of most agencies
>
> **Internal Ops** — Qera's own security (client credentials, access, offboarding). Agencies are breached through their own ops far more often than through client code. This section is not optional.

> **How to use this for a new project:**
> 1. **Threat model first (Section 0)** — what data does this hold, who would attack it, what's the blast radius. This decides the tier. Do it before writing code, not after.
> 2. **Floor is automatic** — every Floor item applies. Don't audit *whether* to do them; audit whether they *pass*.
> 3. **Tier-up by data, not budget** — if the app touches the L2/L3 triggers, those items are in scope regardless of price. Price the engagement accordingly or descope the risky feature.
> 4. **Verify, don't assume** — run the Verify step. "Should be fine" is how the cafe shipped.
> 5. **Apply stack addendum** — layer the relevant `[NextJS/Vercel]` / `[Supabase]` / `[Managed]` / `[Automation]` section.
> 6. **Re-run on change** — security decays faster than SEO. A passing audit is valid until the next `npm install`, the next new route, or the next team change.

---

## Master-Doc Precedence Protocol — cross-checklist conflict resolution

> **This is the canonical copy.** Paste the precedence order and the three rules verbatim into every future master checklist (Performance, Backend, Design, Accessibility, etc.) with a pointer back to this section for the worked examples. When Claude is configuring a project against multiple master docs and two items collide, this protocol decides — no ambiguity, no judgment calls mid-build.

### Precedence order (highest wins on irreconcilable conflict)

1. **Legal & Compliance** — law is not a trade-off; it outranks even security because a control that breaks the law isn't an option
2. **Security** (this document)
3. **Accessibility** — excluding users is a correctness failure, not a style choice
4. **Data integrity / Backend correctness** — wrong data fast is worse than right data slow
5. **Performance**
6. **SEO / AEO / GEO**
7. **Design & Brand preference**

### The three rules

1. **Ownership, not repetition.** Each concern's items live in their own master doc; every other doc **cross-references** ("see Security §8"), never restates. Restated items drift, and drift is where contradictions breed. Where this doc and the SEO doc currently both carry HTTPS, security headers, and email auth — Security owns them; the SEO doc's copies should become pointers on its next revision.
2. **Resolve before you rank.** Most "conflicts" are solved problems — first attempt the modern technique that satisfies both docs (see the worked examples below). Only when genuinely irreconcilable does the higher-ranked doc win.
3. **Floor is never traded.** No lower-ranked doc, client request, deadline, or aesthetic preference overrides a `[Floor]` security item. A conflict with a Floor item is not a dilemma to resolve — it is a feature to descope.

### Worked overlap resolutions

| Conflict | Docs in tension | Resolution |
|---|---|---|
| Bot protection / rate limiting vs. search & AI crawler access | Security §11 vs. SEO (robots, AI crawlers) | **Both win:** allowlist verified crawlers (Googlebot, Bingbot, the AI crawlers the SEO doc explicitly permits) in bot rules; throttle everything else. On authenticated surfaces security wins outright — crawlers have no business behind a login. |
| CSP vs. inline critical CSS/JS for LCP | Security §8 vs. Performance | **Both win:** nonce/hash-based CSP permits specific inline blocks. If the platform can't do nonces, CSP wins and LCP is recovered through other levers (preload, image priority). |
| CAPTCHA vs. conversion friction | Security §11 vs. CRO/Design | **Both win:** invisible, risk-triggered challenges (Turnstile) hit only suspicious traffic. On auth endpoints under attack, security wins. |
| Signed expiring URLs vs. CDN cacheability | Security §10 vs. Performance | **Data sensitivity decides** (per §0 inventory): public assets cache freely; private files get signed URLs and the cache miss is accepted. |
| Third-party scripts | Security §12 vs. Performance vs. Marketing asks | **Aligned, not conflicting:** both docs say minimize. Each script must be justified; SRI + consent gating mandatory. Marketing convenience ranks 7th. |
| Admin paths listed in robots.txt "to keep them out of Google" | SEO instinct vs. Security §15 | **Security wins:** robots.txt is public and *documents* your attack surface. Protect private paths with auth + noindex headers, never by listing them. |
| HSTS preload vs. "we might need HTTP on a subdomain later" | Security §8 vs. ops convenience | **Security wins:** design every subdomain for HTTPS from day one. |

---

## 0 — Pre-Work: Threat Model & Intake

> Run before any other work. This section decides the project's tier and surfaces the blast radius. Skipping it is how teams protect the wrong things — hardening the login page while the API leaks every record.

- [ ] **Data inventory** — list every category of data the app will touch: public content, contact submissions, user accounts, PII (name/email/phone/address), credentials, payment data, health data, government IDs. The most sensitive category sets the floor tier. `[Floor]`
- [ ] **Tier classification** — no sensitive data + no auth → Floor is sufficient. User accounts / stored PII → **L2**. Payments / health / financial / high-value target → **L3**. Document the decision and the reason. `[Floor]`
- [ ] **Blast radius mapping** — for each data category, answer: if this leaked or was tampered with, what is the worst outcome? (one user's order vs. every user's data vs. fund transfer). This ranks what to protect hardest. `[Floor]`
- [ ] **Attacker model** — who realistically attacks this: opportunistic bots/scanners (everyone), competitors, a malicious customer, a motivated targeted attacker? Bots are the baseline threat for *every* site; the cafe was breached by curiosity, not a hacker. `[Floor]`
- [ ] **Trust boundary map** — draw where data crosses from untrusted (browser, third-party webhook, uploaded file, URL parameter) to trusted (your server, your DB). Every boundary crossing needs validation and authorization. This is the document the rest of the checklist enforces. `[L2]`
- [ ] **Regulatory scope** — does this fall under India DPDPA, EU GDPR, UAE PDPL, PCI-DSS (card data), or HIPAA-equivalent (health)? Regulation forces specific controls and changes liability. Flag at intake, not at launch. `[L2]`
- [ ] **Third-party dependency inventory** — list every external service, embed, script, and integration (analytics, payment gateway, chat widget, CRM, automation webhook). Each is an inherited attack surface and a data-sharing relationship. `[L2]`
- [ ] **Inherited-risk check on existing builds** — if taking over an existing site/codebase, assume it is compromised until proven otherwise: audit for exposed secrets in git history, open endpoints, outdated dependencies, and existing user data exposure before you put your name on it. `[L2]`

---

## 1 — Authentication & Identity

> Applies to any app with logins. If the app has no accounts, skip to Section 3 — but contact forms and admin panels still count as auth surfaces.

- [ ] **Never roll your own auth** — use a vetted provider (Supabase Auth, Auth.js/NextAuth, Clerk, Firebase Auth). Hand-rolled auth is the single most common catastrophic agency mistake. *(Verify: confirm a named library/provider owns the auth flow, not custom code.)* `[Floor]`
- [ ] **Passwords hashed with bcrypt, scrypt, or Argon2** — never MD5, SHA-1, SHA-256, or plaintext. A managed auth provider handles this; if you ever see a raw password column, stop. *(Verify: inspect the user table — the password field must be an opaque hash, never readable.)* `[Floor]`
- [ ] **Passwords never logged, never in URLs, never in error messages** — credentials only ever travel in POST bodies over HTTPS. `[Floor]`
- [ ] **Minimum password policy** — 8+ characters minimum, check against known-breached password lists (most providers offer this); do NOT force arbitrary complexity rules (uppercase+symbol+number) — current NIST guidance favours length over composition. `[L2]`
- [ ] **Generic auth error messages** — "Invalid email or password", never "email not found" vs. "wrong password". Distinct errors let attackers enumerate valid accounts. *(Verify: test login with a known-bad email and a known-good email — the error must be identical.)* `[L2]`
- [ ] **Rate limiting on login, signup, password reset, and OTP endpoints** — without it, credential stuffing and brute force are free. *(Verify: hit the login endpoint 20× rapidly — it must throttle or lock.)* `[Floor]`
- [ ] **Account lockout or exponential backoff** after repeated failures — paired with rate limiting. `[L2]`
- [ ] **MFA available** for user accounts; **enforced** for admin/privileged accounts. `[L2]`
- [ ] **Secure password reset flow** — single-use, time-limited (≤1hr), cryptographically random token sent to verified email; token invalidated on use; reset does not reveal whether the email exists. *(Verify: request a reset, use the link twice — second use must fail.)* `[L2]`
- [ ] **Email verification** on signup before granting access to sensitive features. `[L2]`
- [ ] **No default or hardcoded credentials** anywhere — no `admin/admin`, no committed test accounts in production. *(Verify: grep the codebase and env for default creds.)* `[Floor]`
- [ ] **OAuth/SSO state parameter validated** — if using social login, the `state` param must be checked to prevent CSRF on the OAuth flow (the provider library handles this — confirm it's not disabled). `[L2]`
- [ ] **Step-up authentication** for high-risk actions (changing email, password, payment method, deleting account) — re-prompt for credentials or MFA. `[L3]`

---

## 2 — Session Management

- [ ] **Session tokens are cryptographically random and high-entropy** — never sequential, never guessable, never derived from user data. (Provider-handled; confirm.) `[Floor]`
- [ ] **Session cookies set with `HttpOnly`** — blocks JavaScript access, neutralising session theft via XSS. *(Verify: inspect the cookie in DevTools → Application → Cookies; HttpOnly column must be checked.)* `[Floor]`
- [ ] **Session cookies set with `Secure`** — cookie only sent over HTTPS. *(Verify: same inspection, Secure flag set.)* `[Floor]`
- [ ] **Session cookies set with `SameSite=Lax` (or `Strict`)** — primary CSRF defence; `Lax` is the safe default. *(Verify: cookie SameSite attribute is Lax or Strict, never None without good reason.)* `[Floor]`
- [ ] **Session expires** — idle timeout and absolute timeout configured; tokens don't live forever. `[L2]`
- [ ] **Session invalidated on logout** server-side — not just cleared client-side; the token must be dead on the server. *(Verify: capture a session token, log out, replay the token — it must be rejected.)* `[L2]`
- [ ] **Session rotated on privilege change** — new session ID issued on login and on any privilege escalation, preventing session fixation. `[L2]`
- [ ] **Active session management** — users can view and revoke their active sessions; all sessions invalidated on password change. `[L3]`
- [ ] **JWT-specific (if used):** signature verified on every request; algorithm pinned (reject `alg: none`); short expiry with refresh-token rotation; secrets never in the token payload (JWTs are readable by anyone). *(Verify: decode a JWT at jwt.io — confirm no secrets in the payload.)* `[L2]`

---

## 3 — Access Control & Authorization (IDOR / BOLA)

> **This is the cafe bug's home, and the highest-impact section in the document.** Authentication answers "who are you?". Authorization answers "are you allowed to touch *this specific thing*?". Most breaches happen because the second question is never asked. OWASP ranks Broken Access Control as the #1 web risk.

- [ ] **Every data access verifies ownership server-side** — the query must include the authenticated user's ID, not just the resource ID. `getOrder(orderId)` is the bug; `getOrder(orderId, userId)` with a server-side `WHERE user_id = :userId` check is the fix. **This single item would have stopped the cafe attack.** *(Verify: log in as User A, capture a request for one of A's records, change the ID to one belonging to User B, replay it — it MUST return 403/404, never B's data.)* `[Floor]`
- [ ] **No raw sequential IDs exposed in URLs, APIs, or responses** — `/order/42`, `/invoice/7`, `/table/3` are guessable and enumerable by design. Use UUIDs/ULIDs or random tokens. *(Verify: inspect URLs and API responses — no incrementing integers as resource identifiers.)* `[Floor]`
- [ ] **Authorization enforced on the server, never the client** — hiding a button, disabling a field, or `if (user.isAdmin)` in React is UX, not security. The server must independently reject unauthorized requests. *(Verify: call the protected API directly with curl/Postman, bypassing the UI entirely — it must still reject.)* `[Floor]`
- [ ] **Deny by default** — every route and resource is locked unless explicitly permitted, not open unless explicitly blocked. New endpoints should fail closed. `[Floor]`
- [ ] **Auth middleware on every protected route** — not page-by-page hope; a single middleware layer that no protected route can skip. Audit that no route slipped past it. *(Verify: enumerate all routes; confirm each protected one passes through the auth gate.)* `[Floor]`
- [ ] **Role/permission checks on every privileged action** — admin endpoints verify admin role server-side on every call, not once at login. `[L2]`
- [ ] **Function-level authorization** — a logged-in regular user cannot call admin API functions by guessing the endpoint (`/api/admin/deleteUser`). Each function checks the caller's privilege. *(Verify: as a non-admin user, call an admin endpoint directly — must return 403.)* `[L2]`
- [ ] **Mass-assignment / over-posting protected** — users cannot set fields they shouldn't by injecting them into a request body (e.g. adding `"role": "admin"` to a profile-update POST). Whitelist allowed fields server-side. *(Verify: add an unexpected privileged field to an update request — it must be ignored.)* `[L2]`
- [ ] **Anonymous/public flows scoped by signed server-side tokens** — for no-login surfaces like a QR menu, the table/resource ID is encoded in a signed token generated server-side at scan time; the client never sees or controls the raw ID. This is how the cafe *should* have built it. `[L2]`
- [ ] **CORS configured restrictively** — `Access-Control-Allow-Origin` names specific trusted origins, never `*` on authenticated endpoints; credentials mode never combined with wildcard origin. **Note: CORS is a *browser-side* protection — it does not stop server-to-server or scripted requests, so it is not a security boundary; auth and authorization (above) do the real work.** *(Verify: check response headers — no `Allow-Origin: *` on anything behind auth.)* `[L2]`
- [ ] **Direct object references via indirect maps** for the highest-sensitivity resources — the client references a per-session opaque handle that the server maps to the real ID, so real identifiers never leave the server. `[L3]`

---

## 4 — Input Validation & Injection

> Every injection class (SQL, NoSQL, command, LDAP, XML) shares one root cause: untrusted input treated as code. The defence is universal — validate input, parameterise everything.

- [ ] **All database queries parameterised / use an ORM** — never string-concatenate user input into SQL. Parameterised queries make SQL injection structurally impossible. `'; DROP TABLE users; --` must be treated as a literal string, not executed. *(Verify: grep for string concatenation in query construction; test a field with `' OR '1'='1` — it must fail safely.)* `[Floor]`
- [ ] **Input validated server-side against an allowlist** — type, length, format, range. Client-side validation is UX only; the server re-validates everything. Prefer "accept known-good" over "block known-bad". *(Verify: bypass the UI and POST malformed/oversized input directly — server must reject.)* `[Floor]`
- [ ] **Schema validation on all API inputs** — use Zod, Yup, Joi, or equivalent to validate request bodies/params against a strict schema; reject anything that doesn't match. `[L2]`
- [ ] **No user input in OS commands** — avoid shelling out with user data entirely; if unavoidable, use parameterised APIs, never string interpolation into a shell. (Command injection.) `[L2]`
- [ ] **NoSQL injection guarded** — for MongoDB/document stores, validate that input is the expected type; reject objects where strings are expected (blocks `{"$gt": ""}` operator injection). `[L2]`
- [ ] **File path / directory traversal blocked** — user input never used to construct file paths without sanitisation; reject `../` sequences; serve files by ID-to-path mapping, not by user-supplied path. *(Verify: request a file with `../../etc/passwd` style input — must be rejected.)* `[L2]`
- [ ] **Server-Side Request Forgery (SSRF) prevented** — if the server fetches user-supplied URLs (webhooks, image-from-URL, link previews), validate against an allowlist and block requests to internal/private IP ranges (169.254.x, 10.x, 192.168.x, localhost). *(Verify: submit a URL pointing to `http://169.254.169.254/` — must be blocked.)* `[L3]`
- [ ] **Request size limits** — cap body size, array lengths, and JSON nesting depth to prevent resource-exhaustion and parser attacks. `[L2]`
- [ ] **Server-Side Template Injection (SSTI) prevented** — never pass user input into a server-side template engine's evaluation context (Jinja2, Handlebars, EJS, Twig, etc.); user data is *data* rendered by the template, never part of the template string. SSTI escalates straight to remote code execution. *(Verify: inject template syntax like `{{7*7}}` / `${7*7}` into any field that reaches a template — it must render literally, not evaluate to `49`.)* `[L2]`
- [ ] **ReDoS (Regular-expression DoS) guarded** — avoid catastrophic-backtracking patterns (nested quantifiers like `(a+)+`, overlapping alternation); a crafted input against a vulnerable regex pins the CPU and takes the service down. Use linear-time engines (RE2) or validated safe patterns, cap input length before matching, and treat **AI-generated regexes as suspect** (they're frequently vulnerable — cross-ref Backend Part E). *(Verify: test regexes with a ReDoS checker; long adversarial input doesn't hang the request.)* `[L2]`

---

## 5 — Output Encoding & XSS

> Cross-Site Scripting: attacker input rendered as executable script in another user's browser. Modern frameworks block most of it by default — the failures come from the escape hatches.

- [ ] **Framework auto-escaping left ON** — React/Vue/Svelte escape rendered values by default. The vulnerability is opting out. Never bypass it for user-controlled content. `[Floor]`
- [ ] **No `dangerouslySetInnerHTML` / `v-html` / `innerHTML` with user data** — if you must render user HTML (rich text), sanitise with DOMPurify first, with a strict allowlist. *(Verify: grep for `dangerouslySetInnerHTML`, `innerHTML`, `v-html`; confirm each is either static or DOMPurify-sanitised.)* `[Floor]`
- [ ] **Content-Security-Policy header set** — the strongest XSS backstop; blocks inline scripts and unauthorised script sources even if an injection slips through. (See Section 8.) `[L2]`
- [ ] **User content escaped per context** — HTML body, HTML attribute, JavaScript, URL, and CSS contexts each need different encoding; the framework handles most, but URL and attribute contexts are common gaps. `[L2]`
- [ ] **`javascript:` and `data:` URLs blocked in user-supplied links** — a user-provided href of `javascript:alert(1)` is stored XSS; validate URL schemes against an allowlist (http/https/mailto). *(Verify: submit a `javascript:` URL in any link field — must be stripped or rejected.)* `[L2]`
- [ ] **Markdown rendering sanitised** — if you render user Markdown, the HTML output must pass through a sanitiser; raw HTML in Markdown is an XSS vector. `[L2]`
- [ ] **Clipboard attacks defended (hijacking & pastejacking / "ClickFix")** — don't let page content silently alter what a user copies (clipboard hijacking — e.g. swapping a copied crypto address), and never instruct users to paste content into a terminal or dev console as a "verification" step (pastejacking / ClickFix social-engineering is a major 2024–25 malware vector); request clipboard-API permission only when genuinely needed, and never auto-copy sensitive data. A strong CSP (Section 8) limits the XSS that enables clipboard manipulation. `[L2]`
- [ ] **`X-Content-Type-Options: nosniff` set** — prevents browsers from MIME-sniffing a response into executable script. (See Section 8.) `[Floor]`

---

## 6 — Data Protection (In Transit & At Rest)

- [ ] **HTTPS enforced everywhere** — all traffic over TLS; HTTP redirects to HTTPS; no mixed content. *(Verify: load over `http://` — must 301 to https; check for mixed-content warnings in console.)* `[Floor]`
- [ ] **HSTS header set** — `Strict-Transport-Security` forces HTTPS at the browser level after first visit, defeating SSL-strip downgrade attacks. (See Section 8.) `[Floor]`
- [ ] **TLS 1.2 minimum, TLS 1.3 preferred** — TLS 1.0/1.1 and SSLv3 disabled; weak ciphers disabled. (Hosting/CDN-managed on Vercel/Cloudflare — verify it's not been overridden.) *(Verify: run the domain through SSL Labs — target grade A.)* `[Floor]`
- [ ] **Sensitive data encrypted at rest** — managed DB providers encrypt at rest by default; for highly sensitive fields (government IDs, financial), add application-level field encryption on top. `[L2]`
- [ ] **PII minimisation** — collect only what the feature genuinely needs; the safest data is the data you never stored. Don't capture date of birth, full address, or ID numbers "just in case". `[L2]`
- [ ] **Sensitive data never in URLs / query strings** — URLs land in server logs, browser history, referrer headers, and analytics. Tokens, PII, and IDs of sensitive resources go in headers or POST bodies. *(Verify: scan URL patterns for tokens, emails, or sensitive IDs.)* `[Floor]`
- [ ] **Sensitive data masked in logs** — passwords, tokens, card numbers, and PII redacted before logging. *(Verify: grep logs for any credential or full PII string.)* `[L2]`
- [ ] **Payment data never touches your server** — use the gateway's hosted fields / tokenisation (Stripe Elements, Razorpay hosted checkout); you store a token, never a card number. This is also what keeps PCI scope minimal. `[L3]`
- [ ] **Data retention and deletion policy** — defined schedule for purging old data; user deletion actually removes data (and propagates to backups/third parties), not just a soft-delete flag — required under DPDPA/GDPR. `[L3]`
- [ ] **Encryption key management** — keys stored in a secrets manager / KMS, rotated, never in code or the same DB as the data they protect. `[L3]`

---

## 7 — Secrets & Credential Management

> One leaked key in a public repo is a complete breach. This section is short and absolute.

- [ ] **No secrets in frontend code** — API keys, DB credentials, and private tokens never ship to the browser. Anything in client-side JS is public. Use server-side API routes as a proxy for any privileged call. *(Verify: open the deployed site, search the JS bundle and network tab for any key matching `sk_`, `secret`, service-role patterns — there must be none.)* `[Floor]`
- [ ] **`NEXT_PUBLIC_` (and equivalent) used only for genuinely public values** — every var with that prefix is bundled into the client. Never prefix a secret. *(Verify: audit all `NEXT_PUBLIC_` vars — none may be a secret.)* `[Floor]`
- [ ] **No secrets committed to git — ever, including history** — `.env` in `.gitignore` from commit one. A secret in old history is still compromised even if deleted later; it must be rotated, not just removed. *(Verify: run gitleaks / trufflehog across full history.)* `[Floor]`
- [ ] **Secrets stored in the platform's env/secrets manager** — Vercel/Netlify env vars, not in code, not in a committed file. `[Floor]`
- [ ] **Distinct keys per environment** — dev, staging, and production use different credentials; a leaked dev key can't touch production data. `[L2]`
- [ ] **Least-privilege API keys** — each key scoped to only what it needs (read-only where possible); the Supabase service-role key (full DB access, bypasses RLS) lives only server-side and is never exposed. `[L2]`
- [ ] **Secret rotation process** — keys rotated on a schedule and immediately on any suspected exposure or team-member departure. (See Internal Ops.) `[L2]`
- [ ] **Pre-commit secret scanning** — gitleaks or equivalent in a pre-commit hook / CI to block secrets before they're ever pushed. *(Verify: CI fails on a planted test secret.)* `[L2]`

---

## 8 — Security Headers

> Cheap, high-leverage, and the easiest thing to verify objectively. A single config block on Vercel/Next.js sets most of these. **Verify the whole set in one shot: run the deployed URL through securityheaders.com (target A/A+) and Mozilla Observatory.**

- [ ] **`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`** — forces HTTPS, prevents downgrade. `[Floor]`
- [ ] **`X-Content-Type-Options: nosniff`** — blocks MIME-sniffing into executable content. `[Floor]`
- [ ] **`X-Frame-Options: DENY`** (or CSP `frame-ancestors 'none'`) — prevents clickjacking by blocking your site from being iframed. Use `SAMEORIGIN` if you legitimately iframe yourself. `[Floor]`
- [ ] **`Referrer-Policy: strict-origin-when-cross-origin`** — stops full URLs (with any sensitive path/params) leaking to third parties via the referer header. `[Floor]`
- [ ] **`Content-Security-Policy` set** — the heavyweight XSS/injection backstop. Start with a report-only policy, tighten to `default-src 'self'` plus explicit allowlisted sources; eliminate `unsafe-inline`/`unsafe-eval` where the framework allows (Next.js supports nonce-based CSP). Hardest header to get right, highest payoff. `[L2]`
- [ ] **`Permissions-Policy` set** — explicitly disables browser features the site doesn't use (`camera=(), microphone=(), geolocation=()`), shrinking the attack surface. `[L2]`
- [ ] **`Cross-Origin-Opener-Policy: same-origin`** and **`Cross-Origin-Resource-Policy`** — isolates your browsing context from cross-origin attacks (Spectre-class). `[L3]`
- [ ] **No information-disclosing headers** — remove/avoid `X-Powered-By`, `Server` version strings; don't advertise your exact stack and version to scanners. *(Verify: check response headers for version leakage.)* `[L2]`
- [ ] **`X-XSS-Protection` NOT set** — deprecated and can introduce vulnerabilities; rely on CSP instead. (See Deprecated table.) `[L2]`

---

## 9 — API Security

> APIs are where access-control bugs become mass breaches — one missing ownership check can leak every record, not just one page. OWASP maintains a separate Top 10 for APIs because the failure modes differ from web pages.

- [ ] **Every API endpoint authenticated and authorized** — no "internal" endpoint is actually hidden; assume every route is discoverable and enforce auth on each. (Ties to Section 3.) `[Floor]`
- [ ] **Object-level authorization on every API call** — the API verifies the caller owns the requested object, every time (this is API BOLA — the API-layer version of the cafe bug). *(Verify: API-level ID-swap test as in Section 3.)* `[Floor]`
- [ ] **Rate limiting on all API endpoints** — per-user and per-IP; protects against scraping, brute force, and resource exhaustion. `[Floor]`
- [ ] **No sensitive data over-fetching** — the API returns only the fields the client needs; don't send the whole user object (with password hash, internal flags, other users' data) and filter in the UI. Filtering on the client leaks everything to anyone reading the network tab. *(Verify: inspect API responses for fields the UI never displays.)* `[L2]`
- [ ] **Pagination and result limits enforced server-side** — an endpoint can't be coerced into returning the entire table with `?limit=999999`. `[L2]`
- [ ] **Consistent error responses** — APIs don't leak stack traces, SQL errors, or internal paths in responses; generic error + server-side detailed log. *(Verify: trigger an error — response must not contain a stack trace.)* `[L2]`
- [ ] **HTTP methods restricted per endpoint** — a read endpoint rejects POST/DELETE; method-based access bypass closed. `[L2]`
- [ ] **API versioning and deprecation** — old, unmaintained API versions are shut off, not left running as forgotten attack surface. `[L3]`
- [ ] **Webhook signature verification** — incoming webhooks (Stripe, etc.) verified via signature before processing; never trust a webhook payload's authenticity on URL knowledge alone. *(Verify: send an unsigned/forged webhook — must be rejected.)* `[L2]`
- [ ] **Replay attacks prevented on sensitive requests** — a captured-and-resent valid request must not re-execute. The toolkit, by case: **idempotency keys** for create/pay (cross-ref Backend §3/§8), **server-side session invalidation** so a replayed token after logout is dead (§2), **webhook signatures with a timestamp + short tolerance window** (above), and for high-value APIs a **nonce or timestamp+signature / one-time token** so each request is single-use. *(Verify: capture a sensitive request and resend it — it must be rejected or be safely idempotent.)* `[L2]`

---

## 10 — File Upload Security

> Skip only if the app accepts no uploads. If it does, this is a top breach vector — a malicious upload can become remote code execution or stored XSS.

- [ ] **File type validated by content, not just extension** — check magic bytes / MIME, not the filename; `shell.php.jpg` and renamed files must be caught. *(Verify: upload a script renamed with an image extension — must be rejected.)* `[Floor]`
- [ ] **Uploads stored outside the web root / in object storage** — never in a directory the server will execute; use S3/Supabase Storage/Vercel Blob, served as data, never run as code. `[Floor]`
- [ ] **File size limits enforced** — server-side cap prevents storage exhaustion and DoS. `[Floor]`
- [ ] **Uploaded files renamed server-side** — replace user-supplied filenames with random IDs; prevents path traversal and overwrite attacks. `[L2]`
- [ ] **Images re-processed / stripped** — re-encode images server-side to strip embedded payloads and EXIF (which can leak user location/PII). `[L2]`
- [ ] **Uploads served from a separate domain / with `Content-Disposition`** — isolates user content from your app's origin so a malicious file can't run in your security context. `[L2]`
- [ ] **Malware scanning** on uploads for high-sensitivity apps. `[L3]`
- [ ] **Signed, expiring URLs for private files** — access controlled per-user, time-limited; not a public bucket URL anyone can share or guess. *(Verify: confirm private file URLs expire and check ownership.)* `[L2]`

---

## 11 — Rate Limiting & Abuse Prevention

> **Simple per-IP rate limiting is layer 1, not the answer.** Attackers rotate IPs trivially (botnets, proxies), so IP-only limiting fails against a *distributed* attack. Production abuse defence is **layered**: identity-based limits → a distributed counter → gateway/edge enforcement → WAF → behavioural detection. Build outward from identity, not from IP.

- [ ] **Global rate limiting** — every public endpoint has a ceiling; the default posture is throttled, not unlimited. `[Floor]`
- [ ] **Rate-limit by identity, not IP alone** — anchor limits on the authenticated user / API key / auth token; IP is a weak key because it rotates. For anonymous abuse, add **device fingerprinting** as a supplementary signal. IP-only limiting is defeated by any distributed attacker. `[L2]`
- [ ] **Distributed rate limiting via a centralized store** — in serverless/multi-instance deployments, **in-memory per-instance limiters don't actually limit** (each instance has its own counter, so N instances = N× the intended ceiling). Use a shared store (Redis/Upstash) for a global counter. *(Verify: confirm the limiter state is shared across instances, not per-process — cross-ref Backend §8 statelessness.)* `[L2]`
- [ ] **Stricter limits on expensive/sensitive endpoints** — login, signup, password reset, search, file upload, and anything calling a paid third-party API (so an attacker can't run up your bill). `[Floor]`
- [ ] **Bot protection on forms** — contact/signup forms have a honeypot field or CAPTCHA/Turnstile; without it, every public form is a spam and abuse vector. `[L2]`
- [ ] **CAPTCHA on auth after failed attempts** — Cloudflare Turnstile or hCaptcha triggered on suspicious patterns. `[L2]`
- [ ] **Behavioural / bot-pattern detection** — beyond counting requests, detect bot signatures: identical patterns across many IPs, impossible request rates, invalid/missing headers or tokens, fraud-like sequences. Usually delivered by a WAF / bot-management product (Consultant Layer §A); the more advanced layer above simple counting. `[L3]`
- [ ] **Application-layer & algorithmic DoS guarded** — defend against *disproportionate-cost* requests, not just request *volume*: a single cheap request that triggers expensive work (unbounded search, huge export, a catastrophic regex — see §4 ReDoS, an expensive query) is an app-layer DoS. Cap operation cost/complexity, paginate, time-box expensive work, and reject oversized inputs (§4). Also handle **low-and-slow** exhaustion (Slowloris-style slow clients holding connections) with server/edge connection timeouts. `[L2]`
- [ ] **Abuse monitoring and alerting** — spikes in 4xx/5xx, login failures, or traffic from one source trigger an alert. `[L3]`
- [ ] **DDoS protection** — fronted by Cloudflare/Vercel edge (largely platform-provided — confirm it's active, not bypassed by a direct-to-origin path). `[L2]`

---

## 12 — Dependency & Supply Chain

> Most production code is dependencies you didn't write. A vulnerable or malicious package is your vulnerability. This decays continuously — a clean audit today is stale after the next install.

- [ ] **`npm audit` (or equivalent) clean of high/critical at ship** — no known-critical CVEs in the dependency tree at launch. *(Verify: `npm audit --audit-level=high` returns clean.)* `[Floor]`
- [ ] **Lockfile committed** — `package-lock.json` / `pnpm-lock.yaml` pins exact versions so builds are reproducible and a dependency can't silently change under you. `[Floor]`
- [ ] **No abandoned or unvetted packages** — check a dependency's maintenance status and download count before adding it; a random 11-download package is a supply-chain risk. `[L2]`
- [ ] **Automated dependency monitoring** — Dependabot / Renovate / Snyk opens PRs for vulnerable dependencies automatically; security patches don't wait for a human to remember. *(Verify: monitoring is enabled on the repo.)* `[L2]`
- [ ] **Minimal dependency footprint** — every package is attack surface; prefer the platform/standard-library solution over pulling a package for a trivial task. `[L2]`
- [ ] **Subresource Integrity (SRI) on third-party `<script>` tags** — CDN-hosted scripts carry an integrity hash so a compromised CDN can't swap in malicious code. `[L2]`
- [ ] **Third-party scripts audited and minimised** — every analytics/chat/marketing script can read your page and exfiltrate data; justify each one. `[L2]`
- [ ] **Build pipeline secured** — CI/CD secrets scoped and protected; no untrusted code runs in the build with access to production secrets. `[L3]`

---

## 13 — Logging, Monitoring & Incident Response

> You cannot respond to what you cannot see. Most breaches are discovered months later by a third party — because no one was logging.

- [ ] **Security events logged** — logins (success and failure), password changes, privilege changes, access-control denials, admin actions. `[L2]`
- [ ] **Logs exclude secrets and PII** — log the event, not the password/token/full record. (Ties to Section 6.) `[L2]`
- [ ] **Logs centralised and tamper-resistant** — shipped off-box so an attacker who gets in can't erase their tracks; retained long enough to investigate. `[L3]`
- [ ] **Uptime and error monitoring** — Sentry/equivalent for errors; uptime monitor for availability; alerts go somewhere a human sees them. `[L2]`
- [ ] **Anomaly alerting** — unusual auth-failure rates, traffic spikes, or error spikes trigger a notification. `[L3]`
- [ ] **Incident response plan exists** — a written, agreed answer to: who is contacted, how the app is taken offline/isolated, how affected users and regulators are notified, who does forensics. Decide this before the incident, not during. `[L3]`
- [ ] **Breach notification readiness** — know the regulatory clock (DPDPA/GDPR breach-notification windows) and have a contact path to the client and authorities prepared. `[L3]`
- [ ] **Security contact / disclosure path** — a `security.txt` or monitored email so a friendly researcher (the next "cafe video" guy) can report a bug to you instead of posting it. `[L2]`

---

## 14 — Backup & Recovery

- [ ] **Automated backups enabled** — managed DB providers offer point-in-time recovery; confirm it's on, not assumed. `[Floor]`
- [ ] **Backup restoration tested** — an untested backup is a hope, not a backup; actually restore one to confirm it works. *(Verify: perform a test restore at least once.)* `[L2]`
- [ ] **Backups encrypted and access-controlled** — a backup is a full copy of the data and an equal breach target. `[L2]`
- [ ] **Recovery objectives defined** — how much data loss (RPO) and downtime (RTO) is acceptable, agreed with the client. `[L3]`
- [ ] **Ransomware-resilient backups** — at least one immutable/offline copy an attacker with full access can't encrypt or delete. `[L3]`

---

## 15 — Error Handling & Information Disclosure

- [ ] **No stack traces, framework errors, or debug info in production responses** — generic error to the user, detail to the server log. A leaked stack trace hands an attacker your stack, versions, and file paths. *(Verify: trigger a 500 in production — response must be a clean error page, no trace.)* `[Floor]`
- [ ] **Debug mode OFF in production** — framework debug flags, verbose errors, and dev toolbars disabled. *(Verify: confirm `NODE_ENV=production` and no debug flags in prod.)* `[Floor]`
- [ ] **Custom 404 and 500 pages** — no default framework error pages that reveal the stack. `[L2]`
- [ ] **No source maps exposed in production** (unless intentionally, access-controlled) — public source maps hand attackers your readable source. *(Verify: check for `.map` files served publicly.)* `[L2]`
- [ ] **Directory listing disabled** — no browsable file indexes on the server. `[Floor]`
- [ ] **No internal endpoints or admin paths discoverable** in robots.txt, comments, or client code — don't document your attack surface for attackers. `[L2]`

---

## 16 — Infrastructure & Hosting

> On managed platforms (Vercel/Netlify/Cloudflare) most of this is handled — but "handled by default" still needs confirming, and self-hosted changes the picture entirely.

- [ ] **Hosting platform with security defaults** — Vercel/Netlify/Cloudflare provide TLS, DDoS edge protection, and isolation by default. Prefer these over self-managed servers for client work unless there's a strong reason. `[Floor]`
- [ ] **Production, staging, and dev environments separated** — staging is not publicly indexable (`noindex` + auth) and never shares production data or credentials. *(Verify: staging requires auth and is not in Google.)* `[L2]`
- [ ] **Domain & DNS security** — registrar lock enabled, DNS provider account on MFA, DNSSEC where supported; domain hijacking is a total compromise. `[L2]`
- [ ] **Email authentication configured** — SPF, DKIM, and DMARC on any sending domain; prevents your domain being spoofed in phishing (also a deliverability win). *(Verify: check SPF/DKIM/DMARC records resolve.)* `[L2]`
- [ ] **Auto-renewing TLS certificate** — confirm auto-renew is active; an expired cert is an outage and a trust break. `[Floor]`
- [ ] **Principle of least privilege on cloud/infra roles** — service accounts and team members get the minimum access needed. `[L2]`
- [ ] **(Self-hosted only)** OS and server software patched, firewall configured, SSH key-only (no password auth), root login disabled, fail2ban or equivalent. `[L2]`

---

## 17 — Privacy & Compliance

> Where security meets law. Relevant given Qera's India base, Dubai presence, and international clients — DPDPA (India), GDPR (EU clients/users), PDPL (UAE). Not legal advice; flag anything heavy for a lawyer.

- [ ] **Privacy policy present and accurate** — states what's collected, why, how long it's kept, who it's shared with, and user rights. Must match what the site actually does. `[Floor]`
- [ ] **Cookie consent where required** — GDPR/EU traffic needs genuine consent for non-essential cookies/trackers *before* they fire; default to the privacy-preserving option. `[L2]`
- [ ] **Lawful basis and purpose limitation** — data collected only for stated purposes; no quiet repurposing. `[L2]`
- [ ] **User data rights supported** — mechanism for access, correction, and deletion requests (DPDPA/GDPR data-subject rights). Deletion must be real and propagate. `[L2]`
- [ ] **Third-party data sharing disclosed** — every analytics/embed/integration that receives user data is named in the policy; data-processing agreements in place with processors. `[L2]`
- [ ] **Consent and processing records** — for regulated/high-volume data, keep records of consent and processing activity. `[L3]`
- [ ] **Children's data** — if the audience may include minors, additional restrictions apply (DPDPA is strict here); flag for legal review. `[L3]`
- [ ] **Cross-border transfer awareness** — moving personal data across jurisdictions (India ↔ EU ↔ UAE) carries specific requirements; flag for any app handling EU resident data. `[L3]`

---

## Enterprise Security Architecture — Consultant Layer

> **This section is the consultant, not the checklist.** The 17 sections above are *controls* — things you implement. This section is the *tooling and architecture landscape* — the categories of defense the largest platforms in the world run, with a verdict on **when each becomes worth it for Qera or a Qera client, and what the lean answer is until then.**
>
> **The core consulting principle: most of this you do NOT need yet, and a vendor who tells you otherwise is selling.** Buying enterprise security tooling before you have the scale, data sensitivity, or team to operate it is *negative* security — it drains budget, creates false confidence, and generates alerts nobody watches. Capability you can't operate is worse than not having it.
>
> **How to read each category:** what it is · best-in-class options · the **scale trigger** that justifies adopting it · the **lean answer** that covers you until the trigger fires. Tier tags here mean *organizational scale*, not per-project: `[Floor]` = adopt now at any size · `[Growth]` = adopt when a client or Qera hits the trigger · `[Enterprise]` = only at genuine scale / high-value targets / regulated data.

### A — Edge & Network Defense

**WAF (Web Application Firewall)** — filters malicious requests (injection, XSS, bot patterns) before they reach your app; the outer wall.
- *Best-in-class:* Cloudflare WAF, AWS WAF, Akamai; **Radware** and Imperva at the high end.
- *Scale trigger:* any app handling logins or sensitive data that's publicly exposed; effectively the moment you go past a brochure site.
- *Lean answer:* **Cloudflare's free/Pro tier in front of every client site.** It gives you WAF, DDoS, and bot mitigation for near-zero cost and is the single highest-leverage infra decision you can make. Vercel/Netlify include baseline edge protection. `[Floor]` (as Cloudflare) → `[Growth]` (as tuned/managed WAF rules)

**DDoS protection** — absorbs volumetric attacks that try to take the site down.
- *Best-in-class:* Cloudflare, AWS Shield (Advanced for §Enterprise), Akamai.
- *Scale trigger:* any site whose downtime costs money, or any site likely to attract a targeted attack.
- *Lean answer:* Cloudflare/Vercel edge covers the overwhelming majority. AWS Shield Advanced only at genuine enterprise risk. `[Floor]` (baseline) → `[Enterprise]` (Shield Advanced)

**CDN with security posture** — overlaps Performance doc; Security's interest is TLS termination, origin shielding (hiding your real server IP), and edge rules.
- *Lean answer:* Cloudflare/Vercel edge. Cross-ref Performance doc — **Security owns the origin-hiding and TLS-config requirements; Performance owns cache strategy.** `[Floor]`

### B — API Management & Gateway

**API Gateway / Management** — centralizes auth, rate limiting, quotas, key management, and threat protection across many APIs; this is the **Apigee** question.
- *Best-in-class:* **Apigee** (Google), AWS API Gateway, Kong, Azure API Management; Cloudflare API Shield for the security slice.
- *Scale trigger:* you're running **many** APIs, exposing APIs to **third-party developers**, need monetization/quota tiers, or have a microservices backend. A single Next.js app with internal API routes does **not** need this.
- *Lean answer:* **You almost certainly don't need Apigee.** Next.js Route Handlers + per-route auth + Cloudflare rate limiting covers a single product's API. Apigee is for when you're a *platform* with an API as a product. Revisit only at that inflection. `[Enterprise]`
- *Honest note:* if a vendor or article suggested Apigee for a typical agency client site, that's a scale mismatch — file under "what not to buy."

### C — Identity & Access Management (IAM)

**Customer identity (CIAM)** — auth for your app's end users (covered as controls in §1–2).
- *Best-in-class:* Auth0/Okta, Clerk, Supabase Auth, AWS Cognito, Firebase Auth.
- *Lean answer:* Supabase Auth or Clerk for client builds. Auth0/Okta only when a client needs enterprise SSO, SAML, or compliance-grade identity. `[Floor]` (managed auth) → `[Growth]` (Auth0/Okta tier)

**Workforce SSO** — one identity for your team across all tools.
- *Best-in-class:* Okta, Google Workspace SSO, Microsoft Entra ID.
- *Scale trigger:* Qera team beyond a handful of people across many SaaS tools.
- *Lean answer:* **Google Workspace SSO + a team password manager** covers a small studio completely. Dedicated Okta is a 50+ person concern. `[Growth]`

**PAM (Privileged Access Management)** — vaults and rotates credentials for high-privilege accounts, records privileged sessions; the **CyberArk** category.
- *Best-in-class:* **CyberArk**, HashiCorp Vault, AWS Secrets Manager (lighter), 1Password/Bitwarden (entry-level).
- *Scale trigger:* many engineers touching production infra, regulated environments, or audit requirements.
- *Lean answer:* **A team password manager (1Password/Bitwarden) + per-environment scoped keys + cloud-native secrets managers** is the right tier for Qera and SMB clients. **CyberArk is genuine enterprise** — don't even price it until a client demands it for compliance. `[Growth]` (password manager — already in Internal Ops) → `[Enterprise]` (CyberArk/Vault)

### D — Secrets Management (infrastructure-grade)

Beyond §7's hygiene — centralized, audited, auto-rotating secret stores.
- *Best-in-class:* HashiCorp Vault, AWS Secrets Manager, Doppler, Infisical (open-source).
- *Scale trigger:* multiple services/environments sharing secrets, or rotation-on-schedule as a hard requirement.
- *Lean answer:* Platform env vars (Vercel) + Doppler/Infisical when secret sprawl across services becomes real. Vault at infra scale. `[Growth]`

### E — Monitoring, Detection & Response

**SIEM (Security Information & Event Management)** — aggregates logs across systems, correlates them, and alerts on attack patterns; the security analyst's command center.
- *Best-in-class:* Splunk, Microsoft Sentinel, Datadog Security, Elastic Security; Wazuh (open-source).
- *Scale trigger:* you have enough systems and traffic that manual log review is impossible, **and** someone whose job is to watch it. A SIEM with nobody monitoring it is shelfware.
- *Lean answer:* **Sentry (errors) + Cloudflare analytics + platform logs + Better Stack/uptime monitoring.** This is the correct tier for a studio and SMB clients. SIEM is for when there's a security function to operate it. `[Enterprise]`

**EDR / XDR (Endpoint Detection & Response)** — detects threats on devices/endpoints.
- *Best-in-class:* CrowdStrike, SentinelOne, Microsoft Defender for Endpoint.
- *Scale trigger:* a team large enough that endpoints are a managed fleet; regulated data on laptops.
- *Lean answer:* **OS-native (Defender on Windows, FileVault + XProtect on Mac) + disk encryption + MFA** (already in Internal Ops) covers a small team. CrowdStrike is a fleet concern. `[Enterprise]`

**Vulnerability scanning / DAST** — continuously probes running apps for vulnerabilities.
- *Best-in-class:* Snyk, Qualys, Tenable/Nessus; OWASP ZAP (free), Burp Suite (manual).
- *Scale trigger:* L2+ apps; any app holding real user data.
- *Lean answer:* **Snyk (free tier) for dependencies + OWASP ZAP for app scans + Burp for manual testing.** This is genuinely accessible now and you should adopt the free tiers. `[Growth]`

**Pentesting** — humans attacking your app.
- *Lean answer:* For L3/high-value client apps, scope an external pentest (already in §Annual maintenance). For everything else, the 6-test triage list + ZAP is proportionate. `[Enterprise]` (per high-value project)

### F — Application Hardening Libraries (use now, low cost)

These are not enterprise purchases — they're libraries that belong in the build:
- **Input/schema validation:** Zod (TS), Yup, Joi — *(§4)* `[Floor]`
- **HTML sanitization:** DOMPurify — *(§5)* `[Floor]`
- **Security headers (Express/Node):** Helmet — `[Floor]`
- **Rate limiting:** Upstash Rate Limit, express-rate-limit, Cloudflare rules — *(§11)* `[Floor]`
- **Bot/abuse:** Cloudflare Turnstile, hCaptcha — *(§11)* `[Growth]`
- **Secret scanning:** gitleaks, trufflehog (pre-commit/CI) — *(§7)* `[Floor]`
- **Dependency monitoring:** Dependabot, Renovate, Snyk — *(§12)* `[Floor]`
- **Auth:** Supabase Auth, Auth.js, Clerk — *(§1)* `[Floor]`
- **ORM (parameterized queries):** Prisma, Drizzle — *(§4)* `[Floor]`

### G — Governance, Risk & Compliance (GRC)

**Compliance automation** — evidence collection and audit-readiness for SOC 2, ISO 27001, etc.
- *Best-in-class:* Vanta, Drata, Secureframe.
- *Scale trigger:* a client (or Qera) needs a SOC 2 / ISO 27001 certificate to close enterprise deals.
- *Lean answer:* **Don't touch until a deal requires it.** When an enterprise client asks "are you SOC 2 compliant?", *that's* the trigger — and it's a revenue event, so the tooling cost is justified by the contract. `[Enterprise]`
- *Strategic note for Qera:* the first time a prospect asks for SOC 2, treat it as a buying signal, not a blocker. It means you're moving upmarket.

### How Qera should actually sequence this

> The trap is treating this section as a shopping list. It's a **map of where you're going**, adopted in order:

1. **Now, every project (free or near-free):** Cloudflare in front · managed auth · the §F libraries · Snyk/Dependabot free tiers · Sentry · team password manager + MFA. This already puts Qera's output above most agencies.
2. **When a client crosses into real user data / scale (`[Growth]`):** tuned WAF rules · ZAP scans in process · Doppler/Infisical if secrets sprawl · Turnstile · Workforce SSO as the team grows.
3. **Only when scale, high-value data, or a contract demands it (`[Enterprise]`):** SIEM · PAM (CyberArk/Vault) · EDR (CrowdStrike) · API gateway (Apigee/Kong) · GRC (Vanta) · external pentests · AWS Shield Advanced.

**The consultant's bottom line:** Qera's competitive edge isn't owning enterprise tooling — it's *knowing the map* and applying the right tier at the right time. Recommending CyberArk to a café is as much a failure as leaving the café with an IDOR bug. Right-sizing **is** the expertise.



> Layer the relevant addendum on top of the universal checklist. These cover stack-specific failure modes and where responsibility shifts to the platform.

### [NextJS/Vercel] — Custom Next.js on Vercel

- [ ] **Server/client boundary respected** — secrets and privileged logic only in Server Components, Route Handlers, and Server Actions; never leak into client components. `[Floor]`
- [ ] **`'use client'` files contain zero secrets** — everything in a client component ships to the browser. *(Verify: audit client components for env access beyond `NEXT_PUBLIC_`.)* `[Floor]`
- [ ] **Server Actions authenticated and authorized individually** — a Server Action is a public endpoint; it must check auth and ownership itself, not assume the calling page already did. *(Verify: invoke the action's endpoint directly — must enforce auth.)* `[Floor]`
- [ ] **Route Handlers (`/api`) enforce auth + object-level checks** — same rules as Section 3 and 9; the App Router doesn't add protection for free. `[Floor]`
- [ ] **`middleware.ts` used for centralised auth gating** — but know its limits; it's a gate, not the only check — still enforce authorization at the data layer. `[L2]`
- [ ] **Security headers via `next.config.js` `headers()` or middleware** — set the full Section 8 set in one place. *(Verify: securityheaders.com on the deployed URL.)* `[Floor]`
- [ ] **CSP with nonces** for inline scripts via middleware — Next.js supports nonce-based CSP; avoid `unsafe-inline`. `[L2]`
- [ ] **Vercel env vars scoped per environment** (Production/Preview/Development); preview deployments don't carry production secrets. `[L2]`
- [ ] **Preview deployments protected** — Vercel preview URLs are public by default; enable deployment protection / password so staging isn't crawlable. *(Verify: open a preview URL incognito — must require auth.)* `[L2]`
- [ ] **No data leakage through `generateMetadata` / RSC payloads** — server components can accidentally serialise sensitive data into the RSC stream the client receives; return only what's needed. `[L2]`

### [Supabase] — Supabase Backend

> **RLS is the entire security model here. Supabase without RLS is a public database with a nice UI.**

- [ ] **Row Level Security ENABLED on every table** — the moment a table is exposed via the API, RLS off means anyone with the public anon key reads/writes everything. This is the most common catastrophic Supabase mistake. *(Verify: Supabase dashboard → each table shows RLS enabled; query a table with the anon key and no policy — must return nothing.)* `[Floor]`
- [ ] **RLS policies enforce ownership** — policies use `auth.uid() = user_id` so each user touches only their own rows. This is database-level enforcement of Section 3 — even an app-logic bug can't bypass it. *(Verify: as User A, attempt to select/update User B's row through the client — RLS must block it.)* `[Floor]`
- [ ] **`service_role` key server-side only** — it bypasses RLS entirely and has full DB access; if it ever reaches the browser, the whole database is open. *(Verify: confirm service_role appears in no client bundle or `NEXT_PUBLIC_` var.)* `[Floor]`
- [ ] **`anon` key treated as public** — it's meant to be public and safe *only because RLS is on*; never the security boundary by itself. `[Floor]`
- [ ] **Policies for every operation** — separate, correct SELECT / INSERT / UPDATE / DELETE policies; a missing UPDATE policy with a permissive default can be an open door. `[L2]`
- [ ] **Storage bucket RLS / access rules** — Supabase Storage buckets need their own policies; private files require signed URLs, not public bucket access. `[L2]`
- [ ] **Postgres functions use `security definer` carefully** — `security definer` functions run with elevated rights and bypass RLS; audit each one. `[L3]`
- [ ] **Realtime subscriptions respect RLS** — confirm Realtime doesn't broadcast rows a user shouldn't see. `[L2]`
- [ ] **Database roles least-privileged**; **PITR / backups enabled** (Section 14). `[L2]`

### [Managed] — Framer / Webflow / Wix

> Infra, TLS, and patching are the platform's job. Your threat surface shifts to what *you* add: forms, embeds, integrations, and access.

- [ ] **Platform account on MFA** — the CMS login is now the keys to the whole site; a phished password = full defacement/takeover. `[Floor]`
- [ ] **Form submissions go somewhere secured** — Framer/Webflow forms pipe to email/Sheet/automation; that destination must be access-controlled (this is where the data actually lives). `[Floor]`
- [ ] **Custom code embeds audited** — any custom `<script>` / embed you paste in runs with full page access; vet it like a dependency. No pasting random third-party widgets. `[Floor]`
- [ ] **Third-party integrations least-privileged** — connected apps (analytics, CRM, chat) get minimum scopes; review what each can access. `[L2]`
- [ ] **No secrets in client-side custom code** — embeds are fully public; never put an API key in a Framer/Webflow code block. *(Verify: view source for any key.)* `[Floor]`
- [ ] **Published site has security headers where the platform allows** — set what the platform exposes (some support custom headers / Cloudflare in front). `[L2]`
- [ ] **CMS user roles correct** — collaborators get editor, not admin; remove access when an engagement ends. `[L2]`
- [ ] **Platform plan supports the data sensitivity** — managed platforms are wrong for storing real PII/payments; if the project needs that, it's not a Managed project. Escalate to a custom build. `[L2]`

### [Automation] — n8n / Make / Zapier

> The quiet disaster zone. Automation workflows hold credentials to *everything* they connect and expose webhooks that often have no auth at all.

- [ ] **Webhook URLs treated as secrets + add a verification step** — an unauthenticated webhook URL is a public endpoint anyone who learns it can trigger; add a shared-secret/signature check or token in the first node. *(Verify: call the webhook without the secret — workflow must reject.)* `[Floor]`
- [ ] **Webhook input validated** — data arriving at a webhook is untrusted input; validate it before it flows into downstream systems (it can carry injection just like a form). `[Floor]`
- [ ] **Credentials stored in the platform's credential vault** — never hardcoded into a node, a URL, or a code step. `[Floor]`
- [ ] **Least-privilege connections** — each connected account (Gmail, Sheets, DB, CRM) scoped to the minimum; a breached automation account can reach everything it's connected to. `[L2]`
- [ ] **No sensitive data in execution logs** — Make/n8n/Zapier store execution history with full payloads; mask PII/secrets and limit log retention. *(Verify: inspect a stored execution — no plaintext secrets/PII.)* `[L2]`
- [ ] **Error and loop guards** — workflows have failure handling and can't runaway-loop into thousands of API calls (cost + DoS on connected services). `[L2]`
- [ ] **Self-hosted n8n secured** — behind auth, on HTTPS, env-encrypted, not exposed raw to the internet. `[L2]`
- [ ] **Access to the automation platform itself on MFA, reviewed on offboarding** — it's a master key to every connected client system. `[Floor]`
- [ ] **Per-client isolation** — one client's workflow/credentials can't access another client's data; separate accounts/folders/instances. `[L2]`

---

## Internal Ops — Qera's Own Security

> Agencies get breached through their own operations far more than through client code. You hold credentials to every client's site, domain, and data — that makes Qera itself a high-value target. This section is not optional, and it scales as the team grows.

### Access & Credentials

- [ ] **Password manager for all credentials** — every client and internal login in a team password manager (1Password/Bitwarden); zero passwords in chat, docs, sheets, or notes. `[Floor]`
- [ ] **MFA on everything that supports it** — email, password manager, GitHub, Vercel, Supabase, registrar, every client platform, every automation tool. `[Floor]`
- [ ] **No shared logins where avoidable** — individual accounts so actions are attributable and access is revocable per person. `[L2]`
- [ ] **Client credentials never sent over chat/email in plaintext** — shared via the password manager's secure sharing, not WhatsApp/Slack/email. `[Floor]`
- [ ] **Least-privilege team access** — each person gets access only to the clients/systems they work on. `[L2]`

### Devices & Accounts

- [ ] **Work devices: disk encryption + lock screen + auto-lock** — a stolen unlocked laptop is a breach of every client you hold. `[Floor]`
- [ ] **Primary email on strong MFA (hardware key / authenticator, not SMS)** — your email resets every other account; it's the master key. `[Floor]`
- [ ] **Phishing awareness** — you are a target precisely because you hold client access; verify unusual requests out-of-band. (The "client" asking you to urgently change a payment/DNS setting may not be the client.) `[L2]`
- [ ] **Separate personal and Qera accounts** — client work isn't run through personal logins that can't be controlled or revoked. `[L2]`

### Offboarding & Lifecycle

> **The single most-skipped agency control.** When a contractor, intern, or team member leaves, their access often just... stays. Given Qera's interns and lean team, write this process down now.

- [ ] **Offboarding checklist exists and is followed** — on any departure: revoke all client and internal access, rotate any shared secrets they knew, remove from password manager and all platforms, transfer owned resources. *(Verify: after a departure, confirm zero residual access.)* `[L2]`
- [ ] **Access reviews on a schedule** — quarterly, confirm who has access to what and strip anything no longer needed. `[L2]`
- [ ] **Secret rotation on departure** — any credential a departing person could have seen is rotated, not trusted. `[L2]`

### Client Handling

- [ ] **Per-client access isolation** — a breach of one client's stored credentials can't cascade to others; segment access. `[L2]`
- [ ] **Secure intake for client secrets** — when clients send you their credentials/keys, receive them through a secure channel, store in the vault, never leave them in an inbox. `[L2]`
- [ ] **Security baseline stated in proposals/contracts** — define what security Qera provides at each tier, and (importantly) the limits of liability. Turns Section-0 tiering into a written, defensible position — and a selling point most agencies can't make. `[L2]`
- [ ] **Data-processing clarity** — contracts state how client/end-user data is handled, especially under DPDPA/GDPR; you may be a "processor" with legal obligations. `[L3]`

---

## Maintenance Schedule

> **Retainer pitch — and a real obligation.** Security decays faster than SEO: every new dependency, route, and team change can reintroduce risk. Initial hardening is one-time; the items below recur. Scope these into "Security Retainer" / "Managed Security" engagements. **A site secured at launch and never touched is not a secure site.**

### Monthly

- [ ] Dependency vulnerability scan — `npm audit` / Snyk / Dependabot alerts reviewed and high/critical patched
- [ ] Uptime and error-monitor review — investigate anomalies, auth-failure spikes
- [ ] Access review (lightweight) — anyone who left this month fully offboarded?
- [ ] Backup verification — backups running; spot-check a restore quarterly (below)
- [ ] Failed-login / abuse pattern review on auth-heavy apps `[L2+]`
- [ ] New-route audit — any endpoint shipped this month carries auth + object-level checks?

### Quarterly

- [ ] **Security header re-audit** — securityheaders.com + Mozilla Observatory on key client sites; confirm no regression
- [ ] **Test backup restore** — actually restore one; an untested backup is a hope
- [ ] **Access review (full)** — who has access to what across all clients and internal tools; strip the unneeded
- [ ] **Secret rotation** — rotate keys on schedule and for anyone who departed
- [ ] **TLS / SSL Labs check** — target grade A on client domains; confirm certs auto-renewing
- [ ] **RLS / authorization spot-check** — re-run the ID-swap test on a sample of client apps `[Supabase/L2+]`
- [ ] **This checklist reviewed** — update for new OWASP guidance, new platform features, newly deprecated practices (mirrors the SEO doc's living-document discipline)
- [ ] **Automation audit** — webhook auth, credential scope, execution-log hygiene across all workflows `[Automation]`
- [ ] **DMARC / email-auth report review** — SPF/DKIM/DMARC still valid

### Annually

- [ ] **Full security audit re-run** — entire checklist at the project's tier, all clients
- [ ] **Penetration test** for L3 / high-value client apps — external professional pentest where the stakes justify it
- [ ] **Incident response plan review and tabletop** — walk through "what if client X is breached today"; update contacts and steps
- [ ] **Privacy / compliance review** — DPDPA / GDPR / PDPL updates; policies still accurate to what apps do
- [ ] **Domain & registrar review** — locks, MFA, DNSSEC, expiry/auto-renew across all managed domains
- [ ] **Tier reassessment** — has any client's data sensitivity grown into a higher tier?
- [ ] **Full dependency hygiene pass** — prune abandoned packages, reduce footprint
- [ ] **Offboarding-process audit** — confirm no orphaned access exists anywhere

---

## Notes

### Verification Toolbox

| Need | Tool |
|---|---|
| Security headers grade | securityheaders.com · Mozilla Observatory |
| TLS / SSL config grade | SSL Labs (ssllabs.com/ssltest) |
| Dependency CVEs | `npm audit` · Snyk · Dependabot · Renovate |
| Secrets in git/history | gitleaks · trufflehog |
| IDOR / access control | Manual ID-swap test (the core test) · Burp Suite · OWASP ZAP |
| General web vuln scan | OWASP ZAP (free) · Burp Suite |
| Supabase RLS | Dashboard RLS status + anon-key query test |
| Email authentication | mxtoolbox (SPF/DKIM/DMARC lookup) |
| Standard reference | OWASP ASVS · OWASP Top 10 · OWASP Cheat Sheet Series |

### The 6 tests that catch the most real-world damage

> If a deadline forces triage, run these six. They map to the highest-impact, most-common failures.

1. **ID-swap test** (Section 3) — log in as A, request B's resource by changing the ID → must be denied. *Catches the cafe bug.*
2. **Direct API call** (Section 3/9) — call a protected endpoint with curl, bypassing the UI → must enforce auth.
3. **Secret scan of the client bundle** (Section 7) — search deployed JS/network for keys → must find none.
4. **RLS-on check** (Supabase) — every exposed table has RLS enabled → or the DB is public.
5. **securityheaders.com** (Section 8) — one URL, instant grade → target A.
6. **`npm audit`** (Section 12) — known criticals at ship → must be clean.

### Deprecated & Anti-Patterns (do NOT implement)

| Practice | Status | Use instead |
|---|---|---|
| MD5 / SHA-1 / SHA-256 for passwords | **Insecure** | bcrypt / scrypt / Argon2 |
| Rolling your own auth / crypto | **Anti-pattern** | Vetted provider (Supabase Auth, Auth.js, Clerk) + standard libraries |
| `X-XSS-Protection` header | **Deprecated** — can introduce vulns | Content-Security-Policy |
| TLS 1.0 / 1.1, SSLv3 | **Disabled/insecure** | TLS 1.2 minimum, 1.3 preferred |
| Sequential integer IDs in URLs | **IDOR by design** | UUID / ULID / signed tokens |
| Client-side-only authorization | **Bypassable** | Server-side enforcement, always |
| Forced periodic password expiry + complexity rules | **Outdated (NIST)** | Length + breached-password check; rotate only on compromise |
| Security by obscurity (hidden endpoints as "protection") | **Not security** | Real auth on every endpoint |
| Secrets in `NEXT_PUBLIC_` / client code | **Public exposure** | Server-side env / secrets manager |
| Storing card numbers yourself | **PCI nightmare** | Gateway tokenisation (Stripe/Razorpay hosted) |
| SMS as primary MFA for high-value accounts | **SIM-swap risk** | Authenticator app / hardware key |
| Supabase tables without RLS | **Public database** | RLS enabled + ownership policies on every table |
| Unauthenticated automation webhooks | **Open trigger** | Signature/shared-secret verification |

### Scope & honesty notes

- **On "end-to-end / complete":** the 17 control sections + stack addendums + internal ops cover the full *control surface* for the web applications Qera builds, and the Consultant Layer maps the full *enterprise tooling landscape* above that. But no security document is ever "finished" — the threat landscape, OWASP guidance, and tooling move continuously. This is a complete *map*, maintained; it is not a one-time guarantee. Anyone who tells you their security checklist is "complete and final" is the person to trust least.
- This checklist is **defence-in-depth guidance**, not a guarantee. Security is probabilistic; the goal is to be a hard target and to fail safely, not to claim "unbreachable" (a claim no honest operator makes — and a useful tell when a vendor does).
- It is **not legal advice.** Compliance items (Section 17) flag where a lawyer is needed for anything regulated or high-stakes.
- **Tier by data sensitivity, never by client budget.** The one place this document must not bend: if a client won't fund the tier their data requires, descope the risky feature — don't ship it underprotected.
- **Right-sizing is the expertise.** The Consultant Layer exists so Qera adopts enterprise tooling *when the trigger fires, not before*. Over-buying security is negative security: cost, false confidence, and unwatched alerts. Recommending the wrong tier in either direction is a consulting failure.
- **On precedence:** when this doc meets another master doc, the Precedence Protocol governs. Security ranks second only to Legal & Compliance, and `[Floor]` items are never traded.
- **Living document.** OWASP guidance, platform features, and deprecations move. Review quarterly (it's in the schedule). v1.1 reflects standards and tooling current as of authoring; verify specifics for anything safety-critical.
