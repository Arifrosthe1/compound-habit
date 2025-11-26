# Compounding Habits

Turn small daily changes into significant long-term progress.

Compounding Habits is a small client-side web prototype that helps you track goals which change incrementally each day (for example: weight, reading pages, push-ups). It supports both growth (increase) and reduction (decrease) goals and shows projected progress using a repeatable daily "rate".

Key ideas:
- Treat daily improvements like a small interest rate that compounds over time.
- Visualize both your actual logged values and the expected projection.
- Tune rate and projection behavior before committing to a goal.

---

**Status:** Prototype / experimental — contributions are welcome.

## Features

- Create goals for values that should increase or decrease.
- Per-goal fields: start, current, target, unit, daily rate (percent), optional ramp exponent for decrease behavior.
- Log real daily values or apply the app's computed daily step.
- Edit, delete, or reset goals.
- Interactive Info modal with a Chart.js visualization comparing actual history and expected projection.
- Live projection preview in the Add/Edit modal (mini sparkline and estimated reach date).
- Persists data locally in the browser (localStorage key: `compoundingHabits`).

## Quick start

No build step or external tooling required — this is a static HTML/CSS/JS app.

1. Clone the repo:

```powershell
git clone https://github.com/Arifrosthe1/compound-habit.git
cd compound-habit
```

2. Open the app:

- Option A — open `index.html` directly in your browser (double-click the file).
- Option B — run a simple local server (recommended to avoid any restrictions with local resources):

```powershell
# Python 3
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

3. Use the UI to add goals, log values, and click **Info** on a goal to view projections and history.

## How the projections work (short)

- For increase-type goals the app applies a multiplicative daily rate to compute the next expected value.
- For decrease-type goals the app can use a configurable ramp curve (default: power curve) so the absolute step is smallest at the beginning and grows as you approach the target — this helps model habits like gradually reducing a metric.
- The same compounding logic is used for the charts and the "Apply compound" action, ensuring consistency between projection and action.

## Files in this repo

- `index.html` — user interface and modal templates
- `style.css` — app styling and responsive layout
- `app.js` — core logic, persistence, and Chart.js integration

## Troubleshooting

- Blank charts or missing behavior: ensure Chart.js is loaded before `app.js` and try serving the app over HTTP (see Quick start Option B).
- If data appears missing, check your browser's `localStorage` for the key `compoundingHabits`.

## Contributing

Contributions and suggestions are welcome:

- File issues for bugs or feature ideas.
- Open pull requests against `main` with clear descriptions and minimal, focused changes.
- If you plan a large change, open an issue first to discuss design and scope.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.




