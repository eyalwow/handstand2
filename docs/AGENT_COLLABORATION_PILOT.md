# Agent collaboration pilot (no-cost baseline)

Status: documentation-only pilot. No agent-to-agent automation is enabled.

## Current access
- Codex: use existing ChatGPT sign-in and plan limits; no API billing.
- Claude Free: browser chat review only. Claude Code is not included with Free; do not automate the website or reuse browser cookies/tokens.
- GitHub Actions: do not add OpenAI/Anthropic API secrets, paid services, or agent-triggered workflows without explicit approval.

## Proposed handoff
1. Codex develops in a separate feature branch and opens a draft PR.
2. Export a bounded, sanitized diff and tests summary for independent Claude Free review, manually.
3. Claude review must identify concrete files/lines, severity, reproduction and evidence; no claims of having run tests unless actually run.
4. Codex validates findings and fixes confirmed issues. Max two review iterations.
5. Run existing CI. Human approval is required before merge or Production.

## Safeguards
- Never alter Production, merge branches, deploy, change SSO, or expose secrets without owner approval.
- Keep Coach and athlete app scopes separate.
- No autonomous API calls or external purchases.
- Treat agent review as suggestions, not evidence of correctness.
- Do not adjust movement-analysis scoring to fit desired results without real-video evidence.

## Future optional automation (not enabled)
After owner confirms compatible access and explicit spending cap, consider a manually triggered, read-only review workflow with minimal GitHub permissions, no untrusted PR code execution, and no auto-fix or auto-merge.

Pilot branch was forked from feat/movalyt-athlete-ui for isolation; check current active PR branches before applying to newer analysis work.
