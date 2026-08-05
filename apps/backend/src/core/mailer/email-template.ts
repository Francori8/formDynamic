const BRAND_COLOR = '#4f46e5';

export function renderEmail(title: string, bodyHtml: string): string {
  return `
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
  <div style="background: ${BRAND_COLOR}; padding: 1.5rem 2rem; border-radius: 8px 8px 0 0;">
    <span style="color: #fff; font-size: 1.1rem; font-weight: 700;">FormDynamic</span>
  </div>
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 2rem; border-radius: 0 0 8px 8px;">
    <h1 style="font-size: 1.1rem; margin: 0 0 1rem;">${title}</h1>
    ${bodyHtml}
  </div>
  <p style="font-size: 0.75rem; color: #9ca3af; text-align: center; margin-top: 1rem;">
    Este es un mail automático de FormDynamic — no respondas a esta dirección.
  </p>
</div>`.trim();
}
