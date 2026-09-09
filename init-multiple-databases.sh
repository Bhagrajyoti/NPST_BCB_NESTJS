#!/bin/bash
set -e

if [ -z "${MYSQL_MULTIPLE_DATABASES}" ]; then
  echo "MYSQL_MULTIPLE_DATABASES is not set; skipping database creation."
  exit 0
fi

echo "Creating databases: ${MYSQL_MULTIPLE_DATABASES}"

for db in $(echo "${MYSQL_MULTIPLE_DATABASES}" | tr ',' ' '); do
  echo "  -> ${db}"
  mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS \`${db}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci;
EOSQL
done

if [ -n "${MYSQL_APP_USER}" ] && [ -n "${MYSQL_APP_PASSWORD}" ]; then
  echo "Granting ${MYSQL_APP_USER} access to db1..."
  mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<-EOSQL
    CREATE USER IF NOT EXISTS '${MYSQL_APP_USER}'@'%' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
    GRANT ALL PRIVILEGES ON \`db1\`.* TO '${MYSQL_APP_USER}'@'%';
    FLUSH PRIVILEGES;
EOSQL
fi

echo "MySQL initialization finished."
