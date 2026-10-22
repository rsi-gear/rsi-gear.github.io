# GEAR paper website

Project website for **GEAR: An Open General Evolutionary Architecture for Recursive Self-Improvement of LLM Agent Harness**.

- Website: https://rsi-gear.github.io/
- Project repository: https://github.com/rsi-gear/gear

This is a static site with no build dependencies. GitHub Pages publishes the root of the `main` branch; `.nojekyll` serves the assets directly.

To preview locally:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/ in your browser. The Remotion animation sources are maintained with the main GEAR project under `media/gear-loop/src/paper-site/`.
