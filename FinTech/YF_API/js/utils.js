/**
 * Maps standard 3-letter ISO currency codes to their visual symbols.
 */
export function getCurrencySymbol(currencyCode) {
    const symbolMap = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'C$'
    };
    return symbolMap[currencyCode?.toUpperCase()] || '$';
}
