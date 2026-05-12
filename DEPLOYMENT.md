# VDA 6.3 Auditor — deployment and security (Heraeus / enterprise)

## Build artifact

From the repository root:

```powershell
npm install
npm run build
```

Load the **`dist`** folder as an **unpacked extension** in Chrome (`chrome://extensions` → Developer mode → Load unpacked) or Edge (`edge://extensions`).

For store submission, zip the **contents** of `dist` (not the parent folder), matching each store’s packaging rules.

## Chrome Web Store (organisation)

### Link-only distribution (not discoverable in search)

In the Chrome Web Store **Developer Dashboard**, open your extension → **Distribution** → **Visibility**:

| Visibility | Who can install |
|------------|-----------------|
| **Public** | Everyone; listing appears in search and categories. |
| **Unlisted** | **Anyone with the direct Chrome Web Store URL** can install. The extension does **not** appear in store search or browsing—only people you send the link to will normally find it. Same review and privacy requirements as public. |
| **Private** | Only **trusted tester** Google accounts (emails you add in the dashboard) and/or **Google Groups** you manage, or (if enabled) your **Google Workspace domain**. A random person with a leaked URL still **cannot** install unless they are on that list. |

For “I share a link and only people I give it to use the extension,” choose **Unlisted**.  
If the link must **not** work for arbitrary Google accounts (only named people), use **Private** + testers / group / domain publishing.

Official reference: [Chrome Web Store — Distribution (visibility)](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution).

**Security note:** An **unlisted** URL is not a cryptographic secret. Anyone who receives the link can install and could forward it. For stronger control, use **Private** testers, a **Google Group** you curate, **enterprise force-install**, or **domain publishing** (Workspace).

### Original organisation notes

- Use a **private** Chrome Web Store option above if you do not want public discovery.
- Complete the privacy questionnaire truthfully: the extension sends user-composed prompts to **ChatGPT** in the browser when the user clicks **Send** / **Send question to ChatGPT**; data is processed under **OpenAI’s** terms for that session.
- Provide an internal support contact and versioning policy.

## Microsoft Edge Add-ons

### Link-based install without store browse/search (“Hidden”)

1. Publish the extension in **Partner Center** ([publish extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension)).
2. Open your extension → **Availability** → **Visibility** → select **`Hidden`** (not `Public`).  
   Microsoft’s definition: *Hidden removes an extension from search results or browsing at Microsoft Edge Add-ons. To distribute a hidden extension, you must share the listing URL with your customers.*  
   Source: same publish doc, **Availability** → **Visibility**.
3. Copy the **listing URL** from **Partner Center** → your extension → **Overview** (the add-ons page URL for your item). That is the link you send. It is **not** shown in store search when visibility is Hidden.

### “No loophole” — important limitation

**Hidden + a secret link is not strong access control.** Anyone who obtains the listing URL can install the extension from **Microsoft Edge Add-ons** on a normal (unmanaged) Edge profile, the same way as an unlisted Chrome item.

There is **no** Edge Add-ons setting (as of current Microsoft docs) equivalent to Chrome’s **Private** listing that restricts install to named Microsoft accounts only. So for Edge, closing “loopholes” means **not** relying on the link alone:

| Goal | What to do on Edge |
|------|---------------------|
| Link for your users, but **only managed / company** devices | Use **Microsoft Edge management** (Intune, Configuration Manager, or Group Policy): **ExtensionSettings** (allowlist / `force_installed`) so only approved extension IDs can be installed or are pushed silently. Combine with org policy that **blocks** or tightly limits other extension sources. See [ExtensionSettings](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/extensionsettings) and [Manage extensions](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-manage-extensions-policies). |
| Maximum control | **Force-install** your extension to the right users/groups; updates come from the store URL you configure in policy. Users outside the org never receive the policy, so they cannot get an “approved” install path even if they see a link. |
| Link still useful | You can send the **Hidden** listing URL for **optional** user-driven install on allowed devices, or for support/docs; IT can still use **force install** so users don’t depend on the link. |

**Summary:** For Edge, use **Hidden** + **listing URL** for “not discoverable, install via link.” For **no loophole** in a serious security sense, add **enterprise extension policies** (allowlist / force install) on the devices or tenants you control; treat the URL as convenience, not as authentication.

- Same `dist` package as Chrome; submit through Partner Center.
- Align internal documentation with Edge management policies if you standardise on Edge.

## Enterprise force-install (recommended for managed fleets)

### Google Chrome

Use **Chrome Browser Cloud Management** or Group Policy with `ExtensionSettings` to pin the extension ID and update URL (Web Store) or to force-install from an internal CRX (where permitted by your admin model).

### Microsoft Edge

Use **Edge management** templates to deploy the add-on by store ID or allowed extension sources.

Document for end users: how to sign in to ChatGPT, which tenant (consumer vs Enterprise) is approved, and that **audit content may be restricted data** under your classification scheme.

## Threat model (short)

| Asset | Risk | Mitigation in v1 |
|--------|------|------------------|
| Audit data in `chrome.storage.local` | Local profile compromise | Device encryption, corporate device policy; optional future: export-only + no long-term storage |
| Prompts to ChatGPT | Third-party processing, retention per OpenAI | Use **ChatGPT Enterprise** / approved AI policy; minimise PII/customer identifiers in prompts |
| ChatGPT DOM automation | Breakage or unexpected UI behaviour | Clipboard fallback; internal testing when chat UI changes |
| Supply chain (npm) | Vulnerable dependencies | Lockfile, `npm audit`, internal mirror/registry |

## Security checklist before wider rollout

1. **Permissions**: Host access stays limited to ChatGPT / OpenAI chat URLs; `webNavigation` is used only to list **frame IDs** in the active tab so the bridge can talk to the frame that contains the composer (no browsing history collection).
2. **No API keys** in the extension bundle; no remote code execution via CDN scripts.
3. **Data classification**: Align prompts with Heraeus rules; add internal guidance on what may be pasted into ChatGPT.
4. **Updates**: Tag releases; distribute a single approved build hash internally.
5. **User training**: “Import GPT response” only trusts the **last assistant** message; users must verify content before saving in the audit record.

## Troubleshooting

- **Chrome DevTools → Issues → “Content Security Policy blocks eval”**  
  That warning refers to **ChatGPT’s own JavaScript** (e.g. hashed bundles under `chatgpt.com`), not this extension. The VDA bridge does **not** use `eval`. You can ignore that issue for debugging Send behaviour.

- **“Could not reach the ChatGPT page bridge” (or older “Content script not reachable”)**  
  Reload the extension (`chrome://extensions` → **Reload**), then **refresh the ChatGPT tab** (or close extra ChatGPT tabs so only one matches). Current builds **inject the bridge on demand** with `scripting.executeScript`, so this should be rare; if it persists, confirm the tab URL is under `chatgpt.com` or `chat.openai.com`.

- **DevTools Issues → “Node cannot be found in the current page”**  
  Usually harmless: you clicked a **Violating node** link after React re-rendered the side panel, so the old DOM node id is gone. Inspect the live tree from the **Elements** panel instead, or refresh the side panel and re-run the audit.

## Operational notes

- **Questionnaire updates**: Replace `VDA63_Questionnaire_Master_Full_Filled_from_report_74_UPDATED_V9.json` at the repo root and rebuild; `prebuild` copies it to `public/questionnaire.json`.
- **ChatGPT UI changes**: If one-click send fails, users still get **clipboard fallback** when the composer cannot be found or Send cannot be clicked.

## Future hardening (optional)

- Replace DOM bridging with an **approved corporate LLM API** (e.g. Azure OpenAI) so prompts stay in contractually controlled boundaries.
- Add **export** (JSON/PDF) and optional **encryption** of stored state with a user or device key (increases support cost).
