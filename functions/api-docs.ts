const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Knowledge Map API Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"
    />
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        background: #f6f4ef;
        color: #1b1e27;
        font-family: "Iowan Old Style", "Palatino", "Book Antiqua", serif;
      }
      .topbar {
        display: none;
      }
      .swagger-ui .info {
        margin: 24px 0 16px;
      }
      .swagger-ui .info .title {
        color: #1b1e27;
        font-weight: 700;
        letter-spacing: 0.3px;
      }
      .swagger-ui .info .description {
        color: #4b5565;
      }
      .swagger-ui .scheme-container {
        background: #efe7d6;
        box-shadow: none;
        border-radius: 16px;
        border: 1px solid #dfd3bc;
      }
      .swagger-ui .opblock-tag {
        color: #1b1e27;
        font-weight: 700;
      }
      .swagger-ui .opblock {
        border-radius: 14px;
        border: 1px solid rgba(27, 30, 39, 0.1);
        box-shadow: 0 12px 24px rgba(27, 30, 39, 0.06);
      }
      .swagger-ui .opblock-summary-method {
        border-radius: 10px;
        font-weight: 700;
        letter-spacing: 0.6px;
      }
      .swagger-ui .opblock.opblock-post {
        background: rgba(55, 120, 190, 0.08);
        border-color: rgba(55, 120, 190, 0.35);
      }
      .swagger-ui .opblock.opblock-post .opblock-summary-method {
        background: #3778be;
      }
      .swagger-ui .opblock.opblock-get {
        background: rgba(20, 140, 92, 0.08);
        border-color: rgba(20, 140, 92, 0.35);
      }
      .swagger-ui .opblock.opblock-get .opblock-summary-method {
        background: #148c5c;
      }
      .swagger-ui .btn.execute {
        background: #1b1e27;
        border-color: #1b1e27;
        color: #f6f4ef;
      }
      .swagger-ui .btn.authorize {
        background: #efe7d6;
        border: 1px solid #c9b494;
        color: #1b1e27;
      }
      .swagger-ui .parameters-col_description input,
      .swagger-ui .parameters-col_description textarea,
      .swagger-ui .parameters-col_description select,
      .swagger-ui input[type="text"] {
        background: #fffaf0;
        border: 1px solid #dcc9a6;
        border-radius: 10px;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        const baseUrl = window.location.origin;
        window.ui = SwaggerUIBundle({
          url: baseUrl + '/openapi',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>`;

export const onRequestGet: PagesFunction = async () =>
  new Response(swaggerHtml, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
