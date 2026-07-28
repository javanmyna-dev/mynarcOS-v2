/**
 * cards.js — Reusable dashboard card renderer
 *
 * Why a template function instead of copy-pasted HTML per card?
 *   - When you copy-paste card markup, they inevitably drift.
 *     One gets a margin tweak, another gets a different font size,
 *     and soon the dashboard looks inconsistent (exactly what
 *     happened to the v0.1 prototype).
 *   - A single function guarantees every card uses identical
 *     structure and CSS classes. Change the function, and every
 *     card updates at once — no hunting down stray divs.
 *
 * How it works:
 *   renderCard(data) takes a plain object describing what the
 *   card should show, and returns a string of HTML. The object
 *   fields are all optional — omit what you don't need and the
 *   function fills in sensible defaults.
 */

/**
 * @param {Object} card
 * @param {string} [card.icon]     - Emoji or icon character (e.g. '💤')
 * @param {string} [card.title]    - Uppercase label (e.g. 'SLEEP SCORE')
 * @param {string} [card.value]    - Large number/text (e.g. '82')
 * @param {string} [card.subtitle] - Smaller description below the value
 * @param {string} [card.tag]      - Small badge in top-right or below
 * @param {string} [card.empty]    - If set, show empty-state message instead of value
 * @returns {string} HTML string for one card
 */
function renderCard({ icon = '', title = '', value = '', subtitle = '', tag = '', empty = '' } = {}) {
    // If we have real content, show it; otherwise fall back to empty state
    const hasContent = value || subtitle || tag

    if (!hasContent && empty) {
        // Empty-state placeholder
        return `
            <div class="card">
                <div class="card-header">
                    ${icon ? `<span class="card-icon">${icon}</span>` : ''}
                    <span class="card-title">${title}</span>
                </div>
                <div class="card-empty">
                    <span class="card-empty-icon">—</span>
                    <span class="card-empty-text">${empty}</span>
                </div>
            </div>`
    }

    return `
        <div class="card">
            <div class="card-header">
                ${icon ? `<span class="card-icon">${icon}</span>` : ''}
                <span class="card-title">${title}</span>
            </div>
            ${value ? `<div class="card-value">${value}</div>` : ''}
            ${subtitle ? `<div class="card-subtitle">${subtitle}</div>` : ''}
            ${tag ? `<span class="card-tag">${tag}</span>` : ''}
        </div>`
}

/**
 * Renders all cards for a dashboard section into a target container.
 * @param {string} containerId - ID of the container element
 * @param {Array<Object>} cards - Array of card data objects
 */
function renderCardGrid(containerId, cards) {
    const container = document.getElementById(containerId)
    if (!container) return
    container.innerHTML = cards.map(renderCard).join('')
}
