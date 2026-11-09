export const environment = {
  production: false,
  /**
   * Proxy de mismo origen (/api-proxy) configurado en proxy.conf.json hacia Render
   * para prevenir cualquier bloqueo de CORS en el navegador en localhost.
   */
  apiUrl: '/api-proxy'
};


