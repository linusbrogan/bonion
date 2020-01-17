# bonion - a project for PioHacks 2018
The Onion Forecast reads the menu at the Bon and gives a daily onion forecast

# Instructions
## Build:
```
git clone https://github.com/linusaurusrex/bonion.git
cd bonion
docker build -t bonion .
```

## Run:
- `docker run --rm -d -e PORT=80 -p 80:80 bonion`
- Put this behind a reverse proxy with HTTPS
