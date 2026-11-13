module.exports = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111827">
  <title>BUSCAR | Work in progress</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: Arial, Helvetica, sans-serif;
      background: #111827;
      color: #f9fafb;
    }

    * { box-sizing: border-box; }

    body {
      display: grid;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      place-items: center;
      text-align: center;
    }

    main { max-width: 520px; }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid #374151;
      border-radius: 999px;
      color: #d1d5db;
      font-size: 14px;
    }

    .status::before {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
      content: "";
    }

    h1 {
      margin: 24px 0 12px;
      font-size: clamp(32px, 7vw, 48px);
      letter-spacing: -0.04em;
    }

    p {
      margin: 0;
      color: #d1d5db;
      font-size: 17px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <main>
    <span class="status">Work in progress</span>
    <h1>BUSCAR is temporarily unavailable</h1>
    <p>Error — this page is temporarily unavailable. Please try again later.</p>
  </main>
</body>
</html>`;
