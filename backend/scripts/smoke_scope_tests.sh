#!/usr/bin/env bash
set -euo pipefail

# Smoke tests de périmètre Admin/SuperAdmin
# Usage:
#   API_BASE_URL="http://localhost:3001/api" \
#   ADMIN_EMAIL="admin@digitalafrika.com" ADMIN_PASSWORD="admin123" \
#   SUPER_EMAIL="boss@digitalafrika.com" SUPER_PASSWORD="Admin@2026!" \
#   IN_SCOPE_EMPLOYEE_ID="<uuid service admin>" \
#   OUT_SCOPE_EMPLOYEE_ID="<uuid hors service admin>" \
#   ./scripts/smoke_scope_tests.sh

API_BASE_URL="${API_BASE_URL:-http://localhost:3001/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
SUPER_EMAIL="${SUPER_EMAIL:-}"
SUPER_PASSWORD="${SUPER_PASSWORD:-}"
IN_SCOPE_EMPLOYEE_ID="${IN_SCOPE_EMPLOYEE_ID:-}"
OUT_SCOPE_EMPLOYEE_ID="${OUT_SCOPE_EMPLOYEE_ID:-}"

RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
RESET=$'\033[0m'

require_var() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "${RED}Variable obligatoire manquante: ${name}${RESET}"
    exit 1
  fi
}

print_step() {
  echo "${YELLOW}==>${RESET} $1"
}

pass() {
  echo "${GREEN}PASS${RESET} - $1"
}

fail() {
  echo "${RED}FAIL${RESET} - $1"
  exit 1
}

extract_json_value() {
  local json="$1"
  local key="$2"
  python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get(sys.argv[2], ''))" "$json" "$key"
}

login_and_get_token() {
  local email="$1"
  local password="$2"
  local payload
  payload=$(printf '{"email":"%s","password":"%s"}' "$email" "$password")

  local response
  response=$(curl -sS -X POST "${API_BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "$payload")

  local token
  token=$(extract_json_value "$response" "token")
  if [[ -z "$token" ]]; then
    echo "Réponse login: $response"
    fail "Impossible d'obtenir un token pour ${email}"
  fi
  echo "$token"
}

request_status() {
  local method="$1"
  local url="$2"
  local token="$3"
  local data="${4:-}"
  if [[ -n "$data" ]]; then
    curl -sS -o /tmp/resp_body.$$ -w "%{http_code}" \
      -X "$method" "$url" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -sS -o /tmp/resp_body.$$ -w "%{http_code}" \
      -X "$method" "$url" \
      -H "Authorization: Bearer ${token}"
  fi
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" == "$expected" ]]; then
    pass "${label} (HTTP ${actual})"
  else
    echo "Body: $(cat /tmp/resp_body.$$)"
    fail "${label} attendu HTTP ${expected}, obtenu ${actual}"
  fi
}

assert_audit_access_denied() {
  local super_token="$1"
  local label="$2"
  local status
  status=$(request_status "GET" "${API_BASE_URL}/admin/audit-logs?page=1&pageSize=50&actions=ACCESS_DENIED" "$super_token")
  if [[ "$status" != "200" ]]; then
    echo "Body: $(cat /tmp/resp_body.$$)"
    fail "Lecture des audit logs impossible pour vérifier ACCESS_DENIED"
  fi
  local body
  body=$(cat /tmp/resp_body.$$)
  if python3 - <<'PY' "$body"
import json, sys
data = json.loads(sys.argv[1])
items = data.get("items", [])
ok = any(i.get("action") == "ACCESS_DENIED" for i in items)
raise SystemExit(0 if ok else 1)
PY
  then
    pass "${label} - trace ACCESS_DENIED trouvée"
  else
    fail "${label} - aucune trace ACCESS_DENIED détectée"
  fi
}

main() {
  require_var "ADMIN_EMAIL" "$ADMIN_EMAIL"
  require_var "ADMIN_PASSWORD" "$ADMIN_PASSWORD"
  require_var "SUPER_EMAIL" "$SUPER_EMAIL"
  require_var "SUPER_PASSWORD" "$SUPER_PASSWORD"
  require_var "IN_SCOPE_EMPLOYEE_ID" "$IN_SCOPE_EMPLOYEE_ID"
  require_var "OUT_SCOPE_EMPLOYEE_ID" "$OUT_SCOPE_EMPLOYEE_ID"

  print_step "Login Admin"
  ADMIN_TOKEN=$(login_and_get_token "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
  pass "Token admin obtenu"

  print_step "Login SuperAdmin"
  SUPER_TOKEN=$(login_and_get_token "$SUPER_EMAIL" "$SUPER_PASSWORD")
  pass "Token superadmin obtenu"

  print_step "Admin -> accès employé IN scope"
  s=$(request_status "GET" "${API_BASE_URL}/employees/${IN_SCOPE_EMPLOYEE_ID}" "$ADMIN_TOKEN")
  assert_status "$s" "200" "Admin lit employé de son service"

  print_step "Admin -> accès employé OUT scope (doit être refusé)"
  s=$(request_status "GET" "${API_BASE_URL}/employees/${OUT_SCOPE_EMPLOYEE_ID}" "$ADMIN_TOKEN")
  assert_status "$s" "403" "Admin lit employé hors service"

  print_step "Admin -> modification OUT scope (doit être refusée)"
  s=$(request_status "PUT" "${API_BASE_URL}/employees/${OUT_SCOPE_EMPLOYEE_ID}" "$ADMIN_TOKEN" '{"poste":"Test hors scope"}')
  assert_status "$s" "403" "Admin modifie employé hors service"

  print_step "SuperAdmin -> accès employé OUT scope (autorisé)"
  s=$(request_status "GET" "${API_BASE_URL}/employees/${OUT_SCOPE_EMPLOYEE_ID}" "$SUPER_TOKEN")
  assert_status "$s" "200" "SuperAdmin lit employé hors service admin"

  print_step "Vérification des traces ACCESS_DENIED"
  assert_audit_access_denied "$SUPER_TOKEN" "Audit sécurité"

  rm -f /tmp/resp_body.$$ 2>/dev/null || true
  echo "${GREEN}Tous les tests de périmètre sont passés.${RESET}"
}

main "$@"
