"""Inspect locally exported MIME messages without following tracking links."""
import email.policy
import json
import re
import sys
from email.parser import BytesParser
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/ImageCrafter-test-email")
results = []
for path in sorted(root.glob("*.eml")):
    message = BytesParser(policy=email.policy.default).parsebytes(path.read_bytes())
    body = message.get_body(preferencelist=("html",))
    html = body.get_content() if body else ""
    authentication = str(message.get("Authentication-Results", ""))
    result = {
        "file": path.name,
        "recipient": str(message.get("X-Original-To", "")),
        "subject": str(message.get("Subject", "")),
        "spf": bool(re.search(r"\bspf=pass\b", authentication)),
        "dkim": bool(re.search(r"\bdkim=pass\b", authentication)),
        "dmarc": bool(re.search(r"\bdmarc=pass\b", authentication)),
        "reply_to": str(message.get("Reply-To", "")),
        "unresolved_tokens": bool(re.search(r"\{(?:contactfield|dynamiccontent|unsubscribe_url)[^}]*\}", html)),
        "preview_image": 'alt="Your ImageCrafter portrait preview"' in html,
        "preview_fallback": "Your portrait preview is not attached" in html,
        "has_html": bool(html),
    }
    results.append(result)
print(json.dumps(results, indent=2))
assert len(results) == 7, "Expected the seven authorized sample messages"
assert len({r["recipient"] for r in results}) == 5
assert all(r["spf"] and r["dkim"] and r["dmarc"] and r["has_html"] for r in results)
assert all(not r["unresolved_tokens"] for r in results)
assert all("support@imagecrafter.app" in r["reply_to"] for r in results)
assert sum(r["preview_image"] for r in results) == 1
assert sum(r["preview_fallback"] for r in results) == 1
