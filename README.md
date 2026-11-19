# Next Article frontend

Next.js app for the FastAPI article recommender in `../article_recommender_api`.
It searches the model's article catalog by title, uses the selected match's
article ID for the five recent reads, collects optional sections and profile
details, and displays the ranked recommendations returned by the model.

## Run locally

Start the API first, then in this directory:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Next.js rewrite proxies
`/recommender/*` requests to `http://127.0.0.1:8000` by default, so browser
requests stay same-origin and the API does not need CORS configuration.

To point the frontend at a different API host, set `RECOMMENDER_API_URL` before
starting Next.js:

```bash
RECOMMENDER_API_URL=http://127.0.0.1:8000 npm run dev
```

The API must have its model artifacts installed and be ready before it can return
recommendations. The frontend displays API readiness and reports errors from
the service.
