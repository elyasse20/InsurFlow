#!/usr/bin/env python3
"""
InsurFlow Seed Script (Exercice 2026)
Triggers the backend data seeder via API or inserts mock data directly into MongoDB.

Usage:
  python seed_database.py [--api-url http://localhost:8080] [--reset]
"""

import sys
import argparse
import urllib.request
import urllib.parse
import json

def seed_via_api(api_url: str, reset: bool):
    endpoint = f"{api_url.rstrip('/')}/api/seed?reset={'true' if reset else 'false'}"
    print(f"--> Triggering InsurFlow Data Seeder API at: {endpoint}")
    
    req = urllib.request.Request(endpoint, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            data = json.loads(res_body)
            print("\n[SUCCESS] MongoDB database populated with 2026 insurance data!")
            print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"\n[ERROR] Failed to call seed API endpoint: {e}")
        print("Make sure the Spring Boot backend container is running.")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Seed InsurFlow MongoDB database with realistic 2026 data.")
    parser.add_argument("--api-url", default="http://localhost:8080", help="Base URL of Spring Boot backend (default: http://localhost:8080)")
    parser.add_argument("--reset", action="store_true", default=True, help="Reset existing productions, reglements, clients & compagnes before seeding")
    args = parser.parse_args()

    seed_via_api(args.api_url, args.reset)

if __name__ == "__main__":
    main()
