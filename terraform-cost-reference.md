# Terraform Cost Reference

Estimated monthly costs (USD) for resources managed in this project. Figures are fixed,
lab friendly estimates, not live billing data.

## Required Tags

| Tag | Purpose | Example |
|-----|---------|---------|
| environment | Where it runs | dev |
| app | What it belongs to | bank app |
| owner | Who is accountable | sre team |
| cost center | Chargeback / financial governance | cc4820 |
| managed by | Confirms it is Terraform managed | terraform |

## Sizing Tiers (per container / month)

| Tier | Resources | Est. Cost |
|------|-----------|-----------|
| Small | 0.25 vCPU / 512 MB | $9.00 |
| Medium | 0.5 vCPU / 1 GB | $18.00 |
| Large | 1 vCPU / 2 GB | $36.00 |
| Extra Large | 2 vCPU / 4 GB | $72.00 |

## Supporting Resources

| Resource | Unit | Est. Cost |
|----------|------|-----------|
| Persistent volume | per GB | $0.10 |
| Load balancer (Nginx) | per instance | $9.00 |
| Docker network | per network | $0.00 |

## Current Baseline

| Resource | Tier / Unit | Qty | Monthly |
|----------|-------------|-----|---------|
| PostgreSQL | Medium | 1 | $18.00 |
| Backend | Small | 1 | $9.00 |
| Nginx load balancer | LB instance | 1 | $9.00 |
| Frontend / Nginx | Small | 1 | $9.00 |
| PostgreSQL volume | 10 GB | 1 | $1.00 |
| Docker network | 1 network | 1 | $0.00 |
| Total | | | $46.00 |
