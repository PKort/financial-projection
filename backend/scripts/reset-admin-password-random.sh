#!/bin/sh
set -eu

# Ten skrypt jest przeznaczony do uruchomienia lokalnie na serwerze.
# Hasło ma 128 bitów entropii i jest wypisywane tylko na standardowe wyjście.
if ! command -v openssl >/dev/null 2>&1; then
  echo "Brak programu openssl, potrzebnego do wygenerowania hasła." >&2
  exit 1
fi

generated_password="$(openssl rand -hex 16)"
admin_username="${ADMIN_USERNAME:-admin}"

ADMIN_USERNAME="$admin_username" ADMIN_RESET_PASSWORD="$generated_password" npm run admin:reset-password

printf '\nNowe hasło administratora %s:\n%s\n\nZapisz je teraz w menedżerze haseł. Nie będzie można go ponownie wyświetlić.\n' \
  "$admin_username" "$generated_password"
