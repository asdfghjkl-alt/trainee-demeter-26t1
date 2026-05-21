window.onload = () => {
  window.ui = SwaggerUIBundle({
    url: "/swagger.yaml",
    dom_id: "#swagger-ui",
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIBundle.SwaggerUIStandalonePreset,
    ],
  });
};
