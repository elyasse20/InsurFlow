#!/bin/bash

# ==============================================================================
# InsurFlow - Let's Encrypt SSL Bootstrapping Script
# ==============================================================================
# Domain: insurflow-app.duckdns.org
# Email:  admin@insurflow.ma
# ==============================================================================

set -e

domains=(insurflow-app.duckdns.org)
rsa_key_size=4096
data_path="./certbot"
email="admin@insurflow.ma" # Adding a valid address is strongly recommended
staging=0 # Set to 1 if you're testing your setup to avoid hitting request limits

if [ -d "$data_path/conf/live/$domains" ]; then
  read -p "Existing data found for $domains. Continue and replace existing certificate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

echo "### Creating directories for Certbot..."
mkdir -p "$data_path/conf/live/$domains"
mkdir -p "$data_path/www"

echo "### Creating dummy certificate for $domains..."
path="/etc/letsencrypt/live/$domains"
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1 \
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo

echo "### Starting Nginx container..."
docker compose up --force-recreate -d nginx
echo

echo "### Deleting dummy certificate for $domains..."
docker compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$domains && \
  rm -Rf /etc/letsencrypt/archive/$domains && \
  rm -Rf /etc/letsencrypt/renewal/$domains.conf" certbot
echo

echo "### Requesting Let's Encrypt certificate for $domains..."
# Join $domains to -d args
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Select appropriate email arg
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot
echo

echo "### Reloading Nginx with new SSL certificates..."
docker compose exec nginx nginx -s reload
echo "### SSL configuration completed successfully!"
