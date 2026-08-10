curl -s -X GET "https://api.cloudflare.com/client/v4/zones/c575b03eaa3f1a0030e98d2fd734ca1c/rulesets/phases/http_request_firewall_custom/entrypoint" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result.rules[] | "\n[Rule: \(.description)]\nAction: \(.action)\nExpression: \(.expression)\n---"'
EOF
Salida

Step 1 - get patrouch.ca's zone ID:

curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=patrouch.ca" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result[0].id'

Step 2 - use that zone ID to fetch the actual custom firewall rules (swap PATROUCH_ZONE_ID in):

curl -s -X GET "https://api.cloudflare.com/client/v4/zones/PATROUCH_ZONE_ID/rulesets/phases/http_request_firewall_custom/entrypoint" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result.rules[] | "\n[Rule: \(.description)]\nAction: \(.action)\nExpression: \(.expression)\n---"'

