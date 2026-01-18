/**
 * Initialize axe-core accessibility testing in development mode
 * This will log accessibility violations to the console
 */
export const initAccessibilityAudit = async () => {
  if (import.meta.env.DEV) {
    const React = await import('react');
    const ReactDOM = await import('react-dom');
    const axe = await import('@axe-core/react');

    axe.default(React.default, ReactDOM.default, 1000);
    // eslint-disable-next-line no-console
    console.log('Accessibility auditing enabled');
  }
};
