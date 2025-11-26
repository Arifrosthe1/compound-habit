# Compounding Habits

> Turn small daily changes into massive long-term results.

A small client-side web app to help you track habit goals that compound over time. This repository contains a lightweight HTML/CSS/JS prototype that demonstrates compounding progress, per-goal history, and projected progress using a simple daily "interest rate".

**Status:** In development — contributions welcome! Help grow this project together.

---

## Features

- Create habit goals (increase or decrease a measured value).
- Per-goal current value, start and target values, and daily compounding rate.
- Log daily actual values or apply the daily compound step manually.
- Interactive modal with projected expected progress vs actual history (Chart.js).
- Edit, delete, and reset goals.

## Quick start

No build step required — this is a static client-side app.

1. Clone the repo:

```powershell
git clone https://github.com/Arifrosthe1/compound-habit.git
cd compound-habit
```

2. Open `index.html` in your browser (double-click) or serve with a simple static server. For example, using Python:

```powershell
# for Python 3.x
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

3. Add goals, log values, and click **Info** on a goal to view the expected vs actual progress chart.

## Files

- `index.html` — app UI and templates
- `style.css` — styling
- `app.js` — application logic, localStorage persistence, and Chart.js integration

## Contributing

This project is in active development and contributions are very welcome. Ways to contribute:

- Open issues for bugs, ideas, or feature requests.
- Fork the repo, create a feature branch, and open a pull request.
- Improve documentation, add tests, or propose UX improvements.

Please be respectful and follow common open-source community standards. If you'd like, open an issue first to discuss larger changes.

## Security & privacy notes

- This project is client-side only and does not store secrets or remote credentials in the repository.
- Before publishing, ensure you don't commit any API keys, passwords, or private data.
- If you're going to deploy this with a backend, never hard-code secrets — use environment variables or a secrets manager.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.


