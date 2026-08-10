curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/c575b03eaa3f1a0030e98d2fd734ca1c/rulesets/phases/http_request_firewall_custom/entrypoint" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "action": "block",
        "description": "Global Infrastructure Shield",
        "expression": "(http.request.uri.path contains \"/wp-\") or (http.user_agent contains \"sqlmap\") or (http.user_agent contains \"python-requests\") or (ip.geoip.country in {\"CN\" \"RU\" \"NP\" \"ID\" \"BR\" \"AF\" \"AL\"})"
      },
      {
        "action": "managed_challenge",
        "description": "SvelteKit Auth AI and Evaluation Shield",
        "expression": "(starts_with(http.request.uri.path, \"/api/auth/\") and http.request.method eq \"POST\") or (http.request.uri.path contains \"/images\") or (http.request.uri.path contains \"/evaluate\")"
      }
    ]
  }' | jq
