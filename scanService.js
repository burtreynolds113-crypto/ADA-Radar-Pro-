import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

/**
 * Perform a simple accessibility triage scan on the given URL. This function fetches
 * the HTML, parses it with jsdom, and checks for a few common issues such as
 * missing alt text on images, inputs without labels, and missing semantic landmarks.
 *
 * @param {string} url The URL to scan.
 * @returns {Promise<{ score: number, issues: Array<{ type: string, severity: string, message: string }> }>} The
 *   accessibility score (0–100) and an array of issues.
 */
export async function scanUrl(url) {
  // Fetch the HTML
  const response = await fetch(url);
  const html = await response.text();

  // Parse into a DOM
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const issues = [];

  // 1) Images missing alt attributes
  const images = [...document.querySelectorAll('img')];
  const missingAlt = images.filter(img => !img.alt || img.alt.trim() === '');
  if (missingAlt.length > 0) {
    issues.push({
      type: 'images_alt',
      severity: 'medium',
      message: `${missingAlt.length} images are missing descriptive alt text.`
    });
  }

  // 2) Form inputs without labels
  const inputs = [...document.querySelectorAll('input, textarea, select')];
  const unlabeled = inputs.filter(input => {
    const id = input.getAttribute('id');
    if (!id) return true;
    const label = document.querySelector(`label[for="${id}"]`);
    return !label;
  });
  if (unlabeled.length > 0) {
    issues.push({
      type: 'form_labels',
      severity: 'high',
      message: `${unlabeled.length} form fields do not have associated labels.`
    });
  }

  // 3) Semantic landmarks
  const landmarks = ['main', 'nav', 'header', 'footer'];
  const hasLandmark = landmarks.some(sel => document.querySelector(sel));
  if (!hasLandmark) {
    issues.push({
      type: 'landmarks',
      severity: 'low',
      message: 'No semantic landmarks detected (main/nav/header/footer).'
    });
  }

  // Calculate the score starting at 100 and subtracting based on severity
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'high') score -= 25;
    if (issue.severity === 'medium') score -= 15;
    if (issue.severity === 'low') score -= 5;
  }
  score = Math.max(0, score);

  return { score, issues };
}