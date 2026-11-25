WATER ML PROJECT - Groundwater Level Prediction (website + Python server)

RUN LOCALLY (Windows, in this folder):
    py server.py
    then open http://localhost:8000
(The site also works without the server: double-click index.html and data is kept in the browser only.)

USE
1. Open the site. It starts empty: go to Upload Data, choose a CSV or text-based PDF table, check the preview, click "Use this data & train models".
2. Needed columns: depth + year + month (or one date column).
   Optional: district, state, rainfall, temperature, latitude, longitude.
3. Districts and states in the Districts & Map tab come from your file. Add latitude/longitude columns for a geographic map.
4. Your dataset, thresholds and prediction history are stored by the server under a private random session ID linked to your browser.
   "Remove data" on the Upload page deletes the dataset. There are no logins: anyone with your session ID could read it.

DEPLOY ONLINE (needs only Python, no pip packages)
Render.com (easy):  push this folder to a GitHub repo -> Render -> New Web Service -> pick the repo ->
    Runtime Python, Build Command: pip install -r requirements.txt, Start Command: python server.py
    (render.yaml is included). Free plan storage is NOT permanent; add a Disk and set DATA_DIR to keep data.
Railway / Fly.io / any Docker host: a Dockerfile is included (set a volume mounted at /data).
Any host with Python: run  python server.py  (reads PORT and DATA_DIR environment variables; MAX_MB limits uploads, default 40).
Static-only hosts (Netlify, GitHub Pages): upload index.html, css, js. It then runs in browser-storage mode.
